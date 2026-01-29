/*
  Instant Payout API
  ------------------
  Initiates an instant payout to the contractor's linked debit card.
  
  Instant payouts typically arrive within minutes but have a fee:
  - 1% of the payout amount (minimum $0.50)
  
  Requirements:
  - The connected account must have instant payouts enabled
  - There must be available balance (not just pending)
  - The contractor must have a debit card linked (not just a bank account)
  
  Note: Standard payouts (2 business days) are free and happen automatically.
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

export async function POST(request) {
  try {
    const { contractorId, amount } = await request.json();

    if (!contractorId) {
      return NextResponse.json(
        { error: "Contractor ID is required" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    // Get the contractor's Stripe account ID
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
      return NextResponse.json(
        { error: "No payout account connected" },
        { status: 400 }
      );
    }

    if (!contractor.stripe_payouts_enabled) {
      return NextResponse.json(
        { error: "Payouts are not enabled for this account" },
        { status: 400 }
      );
    }

    // First, verify they have enough available balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: contractor.stripe_account_id,
    });

    let availableAmount = 0;
    if (balance.instant_available) {
      for (const bal of balance.instant_available) {
        if (bal.currency === "usd") {
          availableAmount += bal.amount;
        }
      }
    }

    // Convert requested amount to cents for comparison
    const amountCents = Math.round(amount * 100);

    if (amountCents > availableAmount) {
      return NextResponse.json(
        { 
          error: "Insufficient balance for instant payout",
          available: availableAmount / 100,
          requested: amount,
        },
        { status: 400 }
      );
    }

    // Calculate the fee (1% with $0.50 minimum)
    const feePercent = 0.01;
    const minFee = 50; // 50 cents
    const calculatedFee = Math.round(amountCents * feePercent);
    const fee = Math.max(calculatedFee, minFee);

    // Create the instant payout
    // Note: Stripe will automatically deduct the fee from the payout
    const payout = await stripe.payouts.create(
      {
        amount: amountCents,
        currency: "usd",
        method: "instant", // This is the key - makes it instant instead of standard
        description: "Instant payout via Barix Billing",
      },
      {
        stripeAccount: contractor.stripe_account_id,
      }
    );

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount / 100,
        fee: fee / 100,
        netAmount: (payout.amount - fee) / 100,
        status: payout.status,
        arrivalDate: payout.arrival_date 
          ? new Date(payout.arrival_date * 1000).toISOString()
          : null,
        method: payout.method,
      },
      message: "Instant payout initiated! Funds should arrive within minutes.",
    });

  } catch (error) {
    console.error("Instant payout error:", error);
    
    // Handle specific Stripe errors
    if (error.type === "StripeInvalidRequestError") {
      if (error.message.includes("instant payouts")) {
        return NextResponse.json(
          { error: "Instant payouts are not available for this account. Please add a debit card in your payout settings." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to process instant payout: " + error.message },
      { status: 500 }
    );
  }
}





