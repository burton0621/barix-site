/*
  Stripe Connect Balance API
  --------------------------
  Fetches the available and pending balance for a contractor's connected account.
  
  This shows how much money is:
  - Available: Can be paid out immediately
  - Pending: Still being processed (usually 2 business days)
  
  Also fetches instant payout eligibility - not all accounts can do instant payouts.
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
      .select("stripe_account_id, stripe_payouts_enabled")
      .eq("id", contractorId)
      .single();

    if (fetchError || !contractor) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    if (!contractor.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        available: 0,
        pending: 0,
        instantPayoutEnabled: false,
      });
    }

    // Fetch the balance from Stripe for this connected account
    let balance;
    try {
      balance = await stripe.balance.retrieve({
        stripeAccount: contractor.stripe_account_id,
      });
    } catch (stripeError) {
      // Account doesn't exist (e.g., test vs live mode switch)
      if (stripeError.code === 'account_invalid' || stripeError.type === 'StripeInvalidRequestError') {
        // Clear the invalid account ID from database
        await supabaseAdmin
          .from("contractor_profiles")
          .update({ 
            stripe_account_id: null,
            stripe_connected_at: null,
            stripe_payouts_enabled: false,
            stripe_charges_enabled: false,
          })
          .eq("id", contractorId);
        
        return NextResponse.json({
          connected: false,
          available: 0,
          pending: 0,
          instantPayoutEnabled: false,
          message: "Payout account needs to be reconnected",
        });
      }
      throw stripeError;
    }

    // Calculate totals from all currency balances (usually just USD)
    // The balance object contains arrays for each currency
    let availableAmount = 0;
    let pendingAmount = 0;
    let instantAvailable = 0;

    // Available balance - can be paid out now
    if (balance.available) {
      for (const bal of balance.available) {
        if (bal.currency === "usd") {
          availableAmount += bal.amount;
        }
      }
    }

    // Pending balance - still being processed
    if (balance.pending) {
      for (const bal of balance.pending) {
        if (bal.currency === "usd") {
          pendingAmount += bal.amount;
        }
      }
    }

    // Instant available - specifically for instant payouts
    // This might be less than available if some funds aren't eligible
    if (balance.instant_available) {
      for (const bal of balance.instant_available) {
        if (bal.currency === "usd") {
          instantAvailable += bal.amount;
        }
      }
    }

    // Check if instant payouts are enabled for this account
    // We need to fetch the account to check capabilities
    const account = await stripe.accounts.retrieve(contractor.stripe_account_id);
    
    // Check if they have a debit card set up for instant payouts
    const instantPayoutEnabled = account.capabilities?.card_payments === "active" ||
                                  balance.instant_available?.length > 0;

    return NextResponse.json({
      connected: true,
      payoutsEnabled: contractor.stripe_payouts_enabled,
      // Stripe amounts are in cents, convert to dollars for display
      available: availableAmount / 100,
      pending: pendingAmount / 100,
      instantAvailable: instantAvailable / 100,
      instantPayoutEnabled,
      // Include the raw balance for debugging if needed
      currency: "usd",
    });

  } catch (error) {
    console.error("Error fetching balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance: " + error.message },
      { status: 500 }
    );
  }
}







