import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin, getAuthenticatedUser } from "@/lib/supabase/server";
import { checkRateLimit, apiError } from "@/lib/api/middleware";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const rateLimit = checkRateLimit(request, { limit: 100 });
    if (!rateLimit.allowed) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    const { contractId } = params;

    // This endpoint is public (for client setup page), so we don't require auth
    const { data: contract, error: queryError } = await supabaseAdmin
      .from("recurring_contracts")
      .select(`
        *,
        clients:client_id (
          id,
          name,
          email
        ),
        contractor:owner_id (
          id,
          company_name,
          logo_url
        )
      `)
      .eq("id", contractId)
      .single();

    if (queryError || !contract) {
      return apiError("Contract not found", 404);
    }

    return NextResponse.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error("Contract GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const rateLimit = checkRateLimit(request, { limit: 100 });
    if (!rateLimit.allowed) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { contractId } = params;

    // Verify the contract belongs to the user
    const { data: contract, error: fetchError } = await supabaseAdmin
      .from("recurring_contracts")
      .select("*")
      .eq("id", contractId)
      .eq("owner_id", user.id)
      .single();

    if (fetchError || !contract) {
      return apiError("Contract not found or unauthorized", 404);
    }

    const { data: body, error: parseError } = await parseBody(request);
    if (parseError) {
      return apiError("Invalid JSON body", 400);
    }

    const { title, description, status } = body;

    // Build update object with only provided fields
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) {
      // Validate status
      const validStatuses = [
        "pending_setup",
        "active",
        "paused",
        "canceled",
        "expired",
        "payment_failed",
      ];
      if (!validStatuses.includes(status)) {
        return apiError(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
      }
      updates.status = status;
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("recurring_contracts")
      .update(updates)
      .eq("id", contractId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating contract:", updateError);
      return apiError("Failed to update contract", 500);
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Contract PATCH error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(request, { params }) {
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

    // If there's an active subscription, cancel it on Stripe
    if (contract.stripe_subscription_id) {
      const { data: contractor, error: contractorError } = await supabaseAdmin
        .from("contractor_profiles")
        .select("stripe_account_id")
        .eq("id", user.id)
        .single();

      if (contractor?.stripe_account_id) {
        try {
          await stripe.subscriptions.cancel(contract.stripe_subscription_id, {
            stripeAccount: contractor.stripe_account_id,
          });
          console.log("Canceled Stripe subscription:", contract.stripe_subscription_id);
        } catch (stripeError) {
          console.error("Error canceling Stripe subscription:", stripeError);
          // Don't fail the request - we'll still mark it as canceled in DB
        }
      }
    }

    // Update contract status to canceled
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("recurring_contracts")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating contract:", updateError);
      return apiError("Failed to cancel contract", 500);
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Contract canceled successfully",
    });
  } catch (error) {
    console.error("Contract DELETE error:", error);
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
