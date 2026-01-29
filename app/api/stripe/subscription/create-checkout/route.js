/*
  Subscription Checkout API
  -------------------------
  Creates a Stripe Checkout session for subscribing to Barix Billing.
  Includes a 7-day free trial.
  
  Flow:
  1. Get or create Stripe customer for the contractor
  2. Create Checkout session with subscription mode and trial
  3. Return checkout URL for redirect
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Debug: Log key info to verify it's loading correctly
const stripeKey = process.env.STRIPE_SECRET_KEY;
console.log("Subscription checkout - Stripe key loaded:", stripeKey ? `${stripeKey.substring(0, 20)}...` : "NOT FOUND");
console.log("Using price ID:", "price_1SqQqwGkhhmcEWD4ktQoucHp");

const stripe = new Stripe(stripeKey, {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// The Price ID for the subscription from your Stripe product catalog (sandbox)
const SUBSCRIPTION_PRICE_ID = "price_1SqQqwGkhhmcEWD4ktQoucHp";

// Trial period in days
const TRIAL_DAYS = 7;

export async function POST(request) {
  try {
    const { contractorId, email, companyName } = await request.json();

    if (!contractorId) {
      return NextResponse.json(
        { error: "Contractor ID is required" },
        { status: 400 }
      );
    }

    // Get the contractor's current info
    const { data: contractor, error: fetchError } = await supabaseAdmin
      .from("contractor_profiles")
      .select("stripe_customer_id, company_name, business_email, subscription_status")
      .eq("id", contractorId)
      .single();

    if (fetchError) {
      console.error("Error fetching contractor:", fetchError);
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    // Check if they already have an active subscription
    if (contractor.subscription_status === 'active' || contractor.subscription_status === 'trialing') {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    let customerId = contractor.stripe_customer_id;

    // Create a Stripe customer if they don't have one yet
    if (!customerId) {
      console.log("Creating new Stripe customer for contractor:", contractorId);
      
      const customer = await stripe.customers.create({
        email: email || contractor.business_email,
        name: companyName || contractor.company_name,
        metadata: {
          contractor_id: contractorId,
          platform: "barix_billing",
        },
      });

      customerId = customer.id;
      console.log("Created Stripe customer:", customerId);

      // Save the customer ID to our database
      await supabaseAdmin
        .from("contractor_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", contractorId);
    }

    // Get the app URL for redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create the Checkout session for subscription with trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      
      line_items: [
        {
          price: SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],

      // 7-day free trial - they won't be charged until trial ends
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          contractor_id: contractorId,
        },
      },

      // Store contractor ID in session metadata for webhook handling
      metadata: {
        contractor_id: contractorId,
      },

      // Where to redirect after checkout
      success_url: `${appUrl}/settings?subscription=success`,
      cancel_url: `${appUrl}/settings?subscription=canceled`,

      // Allow promotion codes if you want to offer discounts
      allow_promotion_codes: true,
    });

    console.log("Created subscription checkout session:", session.id);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error("Subscription checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout: " + error.message },
      { status: 500 }
    );
  }
}

