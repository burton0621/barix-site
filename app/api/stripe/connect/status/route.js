/*
  Stripe Connect Status API
  -------------------------
  Returns the current Stripe Connect status for a contractor.
  Used by the frontend to show whether payouts are enabled,
  if there are pending requirements, etc.
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get("contractorId");

    if (!contractorId) {
      return NextResponse.json(
        { error: "Contractor ID is required" },
        { status: 400 }
      );
    }

    // Get the contractor's Stripe account ID from our database
    const { data: contractor, error: fetchError } = await supabaseAdmin
      .from("contractor_profiles")
      .select("stripe_account_id, stripe_payouts_enabled, stripe_charges_enabled, stripe_requirements")
      .eq("id", contractorId)
      .single();

    if (fetchError) {
      console.error("Error fetching contractor:", fetchError);
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    // If no Stripe account connected yet, return that status
    if (!contractor.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        requirements: null,
        message: "No payout account connected",
      });
    }

    // Fetch fresh status from Stripe to make sure we have the latest info
    // This is important because Stripe may have verified the account since our last check
    try {
      const account = await stripe.accounts.retrieve(contractor.stripe_account_id);

      // Update our database if the status has changed
      if (
        account.payouts_enabled !== contractor.stripe_payouts_enabled ||
        account.charges_enabled !== contractor.stripe_charges_enabled
      ) {
        await supabaseAdmin
          .from("contractor_profiles")
          .update({
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_charges_enabled: account.charges_enabled,
            stripe_requirements: account.requirements,
          })
          .eq("id", contractorId);
      }

      return NextResponse.json({
        connected: true,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        requirements: account.requirements,
        // Provide a human-readable status message
        message: account.payouts_enabled 
          ? "Payouts enabled - you can receive payments"
          : "Verification in progress",
      });

    } catch (stripeError) {
      // If we can't reach Stripe, return cached data from our database
      console.error("Error fetching from Stripe:", stripeError);
      return NextResponse.json({
        connected: true,
        payoutsEnabled: contractor.stripe_payouts_enabled,
        chargesEnabled: contractor.stripe_charges_enabled,
        requirements: contractor.stripe_requirements,
        message: "Using cached status",
        cached: true,
      });
    }

  } catch (error) {
    console.error("Connect status error:", error);
    return NextResponse.json(
      { error: "Failed to get status: " + error.message },
      { status: 500 }
    );
  }
}

