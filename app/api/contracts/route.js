import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin, getAuthenticatedUser } from "@/lib/supabase/server";
import { checkRateLimit, apiError, validateRequired } from "@/lib/api/middleware";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const rateLimit = checkRateLimit(request, { limit: 100 });
    if (!rateLimit.allowed) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const clientId = searchParams.get("client_id") || "";

    let query = supabaseAdmin
      .from("recurring_contracts")
      .select(`
        *,
        clients:client_id (
          id,
          name,
          email
        )
      `)
      .eq("owner_id", user.id);

    if (status) {
      query = query.eq("status", status);
    }

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data: contracts, error: queryError } = await query.order("created_at", {
      ascending: false,
    });

    if (queryError) {
      console.error("Error fetching contracts:", queryError);
      return apiError("Failed to fetch contracts", 500);
    }

    return NextResponse.json({
      success: true,
      data: contracts || [],
    });
  } catch (error) {
    console.error("Contracts GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request) {
  try {
    const rateLimit = checkRateLimit(request, { limit: 50 });
    if (!rateLimit.allowed) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { data: body, error: parseError } = await parseBody(request);
    if (parseError) {
      return apiError("Invalid JSON body", 400);
    }

    // Validate required fields
    const required = ["client_id", "title", "amount", "interval"];
    const missing = validateRequired(body, required);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    const { client_id, title, description, amount, interval, interval_count = 1, duration_months } = body;

    // Validate interval
    if (!["month", "quarter", "year"].includes(interval)) {
      return apiError("Interval must be 'month', 'quarter', or 'year'", 400);
    }

    // Validate amount
    if (amount <= 0 || amount > 999999) {
      return apiError("Amount must be between 0.01 and 999999", 400);
    }

    // Get contractor profile and verify Stripe connection
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from("contractor_profiles")
      .select("stripe_account_id, stripe_charges_enabled")
      .eq("id", user.id)
      .single();

    if (contractorError || !contractor) {
      return apiError("Contractor profile not found", 404);
    }

    if (!contractor.stripe_account_id || !contractor.stripe_charges_enabled) {
      return apiError("Stripe account not connected or charges not enabled", 400);
    }

    // Fetch client details (email is needed for Stripe Customer)
    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, name, email")
      .eq("id", client_id)
      .eq("owner_id", user.id)
      .single();

    if (clientError || !client) {
      return apiError("Client not found or unauthorized", 404);
    }

    const stripeAccount = contractor.stripe_account_id;

    // Create or find Stripe Customer for this client on the connected account
    let stripeCustomerId;
    try {
      const customers = await stripe.customers.list(
        { email: client.email, limit: 1 },
        { stripeAccount }
      );

      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
        console.log("Using existing Stripe customer:", stripeCustomerId);
      } else {
        const newCustomer = await stripe.customers.create(
          {
            email: client.email,
            name: client.name,
            metadata: {
              client_id: client.id,
              contractor_id: user.id,
            },
          },
          { stripeAccount }
        );
        stripeCustomerId = newCustomer.id;
        console.log("Created new Stripe customer:", stripeCustomerId);
      }
    } catch (stripeError) {
      console.error("Error creating/finding Stripe customer:", stripeError);
      return apiError("Failed to create customer on Stripe", 500);
    }

    // Create Stripe Product
    let stripeProductId;
    try {
      const product = await stripe.products.create(
        {
          name: title,
          description: description || undefined,
          metadata: {
            contract_id: "pending", // Will be updated with actual contract ID
            contractor_id: user.id,
            client_id: client.id,
          },
        },
        { stripeAccount }
      );
      stripeProductId = product.id;
      console.log("Created Stripe product:", stripeProductId);
    } catch (stripeError) {
      console.error("Error creating Stripe product:", stripeError);
      return apiError("Failed to create product on Stripe", 500);
    }

    // Create Stripe Price
    let stripePriceId;
    try {
      const amountCents = Math.round(amount * 100);
      const price = await stripe.prices.create(
        {
          currency: "usd",
          unit_amount: amountCents,
          recurring: {
            interval: interval,
            interval_count: interval_count,
          },
          product: stripeProductId,
          metadata: {
            contract_id: "pending",
            contractor_id: user.id,
          },
        },
        { stripeAccount }
      );
      stripePriceId = price.id;
      console.log("Created Stripe price:", stripePriceId);
    } catch (stripeError) {
      console.error("Error creating Stripe price:", stripeError);
      return apiError("Failed to create price on Stripe", 500);
    }

    // Insert contract into database
    const { data: contract, error: insertError } = await supabaseAdmin
      .from("recurring_contracts")
      .insert([
        {
          owner_id: user.id,
          client_id: client.id,
          title,
          description: description || null,
          amount: parseFloat(amount),
          interval,
          interval_count,
          duration_months: duration_months || null,
          status: "pending_setup",
          stripe_customer_id: stripeCustomerId,
          stripe_product_id: stripeProductId,
          stripe_price_id: stripePriceId,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting contract:", insertError);
      return apiError("Failed to create contract in database", 500);
    }

    // Update Stripe product and price metadata with actual contract ID
    try {
      await stripe.products.update(
        stripeProductId,
        {
          metadata: {
            contract_id: contract.id,
            contractor_id: user.id,
            client_id: client.id,
          },
        },
        { stripeAccount }
      );

      await stripe.prices.update(
        stripePriceId,
        {
          metadata: {
            contract_id: contract.id,
            contractor_id: user.id,
          },
        },
        { stripeAccount }
      );
    } catch (updateError) {
      console.error("Warning: failed to update Stripe metadata:", updateError);
      // Don't fail the request over this - contract is already created
    }

    return NextResponse.json(
      {
        success: true,
        data: contract,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Contracts POST error:", error);
    return apiError("Internal server error", 500);
  }
}

async function parseBody(request) {
  try {
    const data = await request.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
