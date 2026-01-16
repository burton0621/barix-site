/*
  Cancel Subscription API
  -----------------------
  Cancels the user's subscription. By default, cancels at the end of the 
  current billing period (so they keep access until then).
  
  If they're on a trial, it cancels immediately and they're not charged.
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
    const { contractorId, cancelImmediately = false } = await request.json();

    if (!contractorId) {
      return NextResponse.json(
        { error: "Contractor ID is required" },
        { status: 400 }
      );
    }

    // Get the contractor's subscription ID
    const { data: contractor, error: fetchError } = await supabaseAdmin
      .from("contractor_profiles")
      .select("stripe_subscription_id, subscription_status")
      .eq("id", contractorId)
      .single();

    if (fetchError || !contractor?.stripe_subscription_id) {
      console.error("Error fetching contractor:", fetchError);
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    console.log("Canceling subscription:", contractor.stripe_subscription_id);

    // Cancel the subscription
    // By default, cancel at period end so they keep access until then
    // If cancelImmediately is true (like during trial), cancel right away
    const subscription = await stripe.subscriptions.update(
      contractor.stripe_subscription_id,
      {
        cancel_at_period_end: !cancelImmediately,
      }
    );

    // If canceling immediately (trial), delete the subscription instead
    if (cancelImmediately || contractor.subscription_status === 'trialing') {
      await stripe.subscriptions.cancel(contractor.stripe_subscription_id);
      
      // Update our database
      await supabaseAdmin
        .from("contractor_profiles")
        .update({
          subscription_status: "canceled",
          stripe_subscription_id: null,
        })
        .eq("id", contractorId);

      console.log("Subscription canceled immediately");
    } else {
      // Just mark as canceling at period end
      await supabaseAdmin
        .from("contractor_profiles")
        .update({
          subscription_status: "canceling",
        })
        .eq("id", contractorId);

      console.log("Subscription set to cancel at period end");
    }

    return NextResponse.json({
      success: true,
      canceledImmediately: cancelImmediately || contractor.subscription_status === 'trialing',
      message: cancelImmediately || contractor.subscription_status === 'trialing'
        ? "Subscription canceled"
        : "Subscription will cancel at the end of your billing period",
    });

  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription: " + error.message },
      { status: 500 }
    );
  }
}

