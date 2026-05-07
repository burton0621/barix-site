import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin, getAuthenticatedUser } from "@/lib/supabase/server";
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

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { contractId } = params;
    const { data: body, error: parseError } = await parseBody(request);
    if (parseError) {
      return apiError("Invalid JSON body", 400);
    }

    const { action } = body;
    if (!action || !["pause", "resume"].includes(action)) {
      return apiError("Action must be 'pause' or 'resume'", 400);
    }

    // Fetch the contract
    const { data: contract, error: fetchError } = await supabaseAdmin
      .from("recurring_contracts")
      .select("*")
      .eq("id", contractId)
      .eq("owner_id", user.id)
      .single();

    if (fetchError || !contract) {
      return apiError("Contract not found or unauthorized", 404);
    }

    if (!contract.stripe_subscription_id) {
      return apiError("Contract has no active subscription", 400);
    }

    // Get contractor's Stripe account
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from("contractor_profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    if (!contractor?.stripe_account_id) {
      return apiError("Contractor Stripe account not found", 500);
    }

    const stripeAccount = contractor.stripe_account_id;

    // Pause or resume the subscription
    try {
      if (action === "pause") {
        // Pause: void pending invoice and pause collection
        await stripe.subscriptions.update(
          contract.stripe_subscription_id,
          {
            pause_collection: {
              behavior: "void",
            },
          },
          { stripeAccount }
        );

        // Update contract status
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("recurring_contracts")
          .update({
            status: "paused",
            updated_at: new Date().toISOString(),
          })
          .eq("id", contractId)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating contract status:", updateError);
          return apiError("Failed to update contract status", 500);
        }

        return NextResponse.json({
          success: true,
          data: updated,
          message: "Contract paused successfully",
        });
      } else {
        // Resume: resume collection
        await stripe.subscriptions.update(
          contract.stripe_subscription_id,
          {
            pause_collection: null,
          },
          { stripeAccount }
        );

        // Update contract status back to active
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("recurring_contracts")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", contractId)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating contract status:", updateError);
          return apiError("Failed to update contract status", 500);
        }

        return NextResponse.json({
          success: true,
          data: updated,
          message: "Contract resumed successfully",
        });
      }
    } catch (stripeError) {
      console.error(`Error ${action}ing subscription:`, stripeError);
      return apiError(`Failed to ${action} subscription: ${stripeError.message}`, 500);
    }
  } catch (error) {
    console.error("Pause/resume error:", error);
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
