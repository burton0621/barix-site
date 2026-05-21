import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, apiError } from "@/lib/api/middleware";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const rateLimit = checkRateLimit(request, { limit: 50 });
    if (!rateLimit.allowed) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    const { contractId } = params;

    // Fetch the contract (public access - for client setup page)
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("recurring_contracts")
      .select(`
        *,
        contractor:owner_id (
          stripe_account_id
        )
      `)
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      return apiError("Contract not found", 404);
    }

    if (!contract.contractor?.stripe_account_id) {
      return apiError("Contractor Stripe account not configured", 500);
    }

    if (!contract.stripe_customer_id || !contract.stripe_price_id) {
      return apiError("Contract not properly configured", 500);
    }

    const stripeAccount = contract.contractor.stripe_account_id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Calculate cancel_at Unix timestamp if duration_months is specified
    let cancelAtTimestamp;
    if (contract.duration_months) {
      const now = Math.floor(Date.now() / 1000);
      // Add duration_months as 30 days each
      cancelAtTimestamp = now + contract.duration_months * 30 * 86400;
    }

    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: "subscription",
          customer: contract.stripe_customer_id,
          line_items: [
            {
              price: contract.stripe_price_id,
              quantity: 1,
            },
          ],
          subscription_data: {
            ...(cancelAtTimestamp && { cancel_at: cancelAtTimestamp }),
            metadata: {
              contract_id: contractId,
              contractor_id: contract.owner_id,
            },
          },
          metadata: {
            contract_id: contractId,
            contractor_id: contract.owner_id,
          },
          payment_method_types: ["card"],
          success_url: `${appUrl}/contract/${contractId}/setup/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/contract/${contractId}/setup?canceled=true`,
        },
        { stripeAccount }
      );

      return NextResponse.json({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (stripeError) {
      console.error("Error creating Stripe checkout session:", stripeError);
      return apiError("Failed to create checkout session: " + stripeError.message, 500);
    }
  } catch (error) {
    console.error("Setup checkout error:", error);
    return apiError("Internal server error", 500);
  }
}
