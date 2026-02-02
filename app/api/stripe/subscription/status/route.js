/*
  Subscription Status API
  -----------------------
  Returns the current subscription status for a contractor.
  Fetches fresh data from Stripe if a subscription exists to ensure accuracy,
  then updates the database with the latest info.
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


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

    // Get subscription info from our database
    const { data: contractor, error: fetchError } = await supabaseAdmin
      .from("contractor_profiles")
      .select(`
        subscription_status,
        subscription_period_end,
        trial_ends_at,
        subscribed_at,
        stripe_customer_id,
        stripe_subscription_id
      `)
      .eq("id", contractorId)
      .single();

    if (fetchError) {
      console.error("Error fetching contractor:", fetchError);
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    // If we have a subscription ID, fetch fresh data from Stripe
    // This ensures we always have accurate status even if webhooks fail
    let subscriptionStatus = contractor.subscription_status || 'none';
    let periodEnd = contractor.subscription_period_end;
    let trialEnd = contractor.trial_ends_at;
    let isTrialing = subscriptionStatus === 'trialing';

    // Try to get subscription - either by subscription ID or by looking up customer's subscriptions
    let subscription = null;
    
    if (contractor.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(contractor.stripe_subscription_id);
      } catch (err) {
        console.log("Could not retrieve subscription by ID:", err.message);
      }
    }
    
    // If no subscription found by ID but we have a customer ID, look up their subscriptions
    if (!subscription && contractor.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: contractor.stripe_customer_id,
          limit: 1,
        });
        if (subscriptions.data.length > 0) {
          subscription = subscriptions.data[0];
          
          // Save the subscription ID to our database for future lookups
          await supabaseAdmin
            .from("contractor_profiles")
            .update({ stripe_subscription_id: subscription.id })
            .eq("id", contractorId);
            
          console.log("Found subscription via customer lookup:", subscription.id);
        }
      } catch (err) {
        console.log("Could not look up subscriptions for customer:", err.message);
      }
    }

    if (subscription) {
      // Debug: Log what Stripe returns
      console.log("Stripe subscription data:", {
        id: subscription.id,
        status: subscription.status,
        trial_end: subscription.trial_end,
        trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        current_period_end: subscription.current_period_end,
        current_period_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        canceled_at: subscription.canceled_at,
        cancel_at_period_end: subscription.cancel_at_period_end,
      });

      // Update local variables with fresh Stripe data
      subscriptionStatus = subscription.status;
      periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      trialEnd = subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : null;
      isTrialing = subscription.status === 'trialing';

        // Check if subscription was canceled
      if (subscription.canceled_at || subscription.cancel_at_period_end) {
        // If canceled and past the period end, mark as canceled
        if (subscription.status === 'canceled') {
          subscriptionStatus = 'canceled';
        } else {
          // Still active but will cancel at period end
          subscriptionStatus = subscription.status;
        }
      }

      // Update database with fresh data from Stripe (in background, don't wait)
      supabaseAdmin
        .from("contractor_profiles")
        .update({
          subscription_status: subscriptionStatus,
          subscription_period_end: periodEnd,
          trial_ends_at: trialEnd,
          stripe_subscription_id: subscription.id,
        })
        .eq("id", contractorId)
        .then(() => {})
        .catch((err) => console.error("Error updating subscription status:", err));
    }

    // Calculate days remaining in trial or subscription period
    let daysRemaining = 0;
    
    if (isTrialing && trialEnd) {
      const trialEndDate = new Date(trialEnd);
      const now = new Date();
      daysRemaining = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
    } else if (periodEnd) {
      const periodEndDate = new Date(periodEnd);
      const now = new Date();
      daysRemaining = Math.ceil((periodEndDate - now) / (1000 * 60 * 60 * 24));
    }

    // Determine if they have access (active or trialing)
    const hasAccess = ['active', 'trialing'].includes(subscriptionStatus);

    return NextResponse.json({
      status: subscriptionStatus,
      hasAccess,
      isTrialing,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      periodEnd,
      trialEnd,
      subscribedAt: contractor.subscribed_at,
      hasCustomer: !!contractor.stripe_customer_id,
      hasSubscription: !!contractor.stripe_subscription_id,
    });

  } catch (error) {
    console.error("Subscription status error:", error);
    return NextResponse.json(
      { error: "Failed to get status: " + error.message },
      { status: 500 }
    );
  }
}
