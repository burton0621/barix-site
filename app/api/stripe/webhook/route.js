/*
  Stripe Webhook Handler
  ----------------------
  Handles webhook events from Stripe for both invoice payments and subscriptions.

  Events handled:
  - checkout.session.completed: Invoice paid or subscription started
  - customer.subscription.created: New subscription created
  - customer.subscription.updated: Subscription status changed
  - customer.subscription.deleted: Subscription canceled
  - invoice.payment_succeeded: Recurring subscription payment succeeded
  - invoice.payment_failed: Payment failed (dunning)

  Important: Configure this in Stripe Dashboard:
  Developers > Webhooks > Add endpoint
  URL: https://yourdomain.com/api/stripe/webhook
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

// Stripe sends the raw body, we need to handle it specially
export async function POST(request) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    // Verify the webhook came from Stripe
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log("Webhook received:", event.type);

    // Handle the event based on type
    switch (event.type) {
      // ============================================
      // CHECKOUT SESSION COMPLETED
      // This fires for both invoice payments and new subscriptions
      // ============================================
      case "checkout.session.completed": {
        const session = event.data.object;

        // Check if this is a subscription checkout or invoice payment
        if (session.mode === "subscription") {
          // This is a new subscription
          const contractorId = session.metadata?.contractor_id;
          const customerId = session.customer;
          const subscriptionId = session.subscription;

          console.log("Subscription checkout completed:", { contractorId, subscriptionId });

          if (contractorId && subscriptionId) {
            // Fetch the subscription to get trial info
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            // Update the contractor's subscription info
            const { error: updateError } = await supabaseAdmin
              .from("contractor_profiles")
              .update({
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                subscription_status: subscription.status,
                subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                trial_ends_at: subscription.trial_end
                  ? new Date(subscription.trial_end * 1000).toISOString()
                  : null,
                subscribed_at: new Date().toISOString(),
              })
              .eq("id", contractorId);

            if (updateError) {
              console.error("Error updating subscription:", updateError);
            } else {
              console.log("Subscription activated for contractor:", contractorId);
            }
          }
        } else {
          // This is an invoice payment (existing logic)
          const invoiceId = session.metadata?.invoice_id;

          if (!invoiceId) {
            console.log("No invoice ID in session - might be subscription only");
            break;
          }

          console.log("Payment successful for invoice:", invoiceId);

          const { error: updateError } = await supabaseAdmin
            .from("invoices")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              stripe_payment_id: session.payment_intent,
              stripe_session_id: session.id,
            })
            .eq("id", invoiceId);

          if (updateError) {
            console.error("Error updating invoice:", updateError);
          } else {
            console.log("Invoice marked as paid:", invoiceId);
          }
        }
        break;
      }

      // ============================================
      // SUBSCRIPTION UPDATED
      // Fires when subscription status changes (trial ends, payment succeeds, etc.)
      // ============================================
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        console.log("Subscription updated:", {
          id: subscription.id,
          status: subscription.status,
          customer: customerId,
        });

        // Find the contractor by their Stripe customer ID
        const { data: contractor } = await supabaseAdmin
          .from("contractor_profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (contractor) {
          // Update subscription status
          const { error: updateError } = await supabaseAdmin
            .from("contractor_profiles")
            .update({
              subscription_status: subscription.status,
              subscription_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              trial_ends_at: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
            })
            .eq("id", contractor.id);

          if (updateError) {
            console.error("Error updating subscription status:", updateError);
          } else {
            console.log("Updated subscription status to:", subscription.status);
          }
        }
        break;
      }

      // ============================================
      // SUBSCRIPTION DELETED (Canceled)
      // Fires when subscription is fully canceled
      // ============================================
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        console.log("Subscription canceled:", subscription.id);

        // Find and update the contractor
        const { data: contractor } = await supabaseAdmin
          .from("contractor_profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (contractor) {
          await supabaseAdmin
            .from("contractor_profiles")
            .update({
              subscription_status: "canceled",
              stripe_subscription_id: null,
            })
            .eq("id", contractor.id);

          console.log(
            "Marked subscription as canceled for contractor:",
            contractor.id
          );
        }
        break;
      }

      // ============================================
      // INVOICE PAYMENT FAILED
      // Fires when a subscription payment fails (card declined, etc.)
      // ============================================
      case "invoice.payment_failed": {
        const invoice = event.data.object;

        // Only handle subscription invoices (not one-time payments)
        if (invoice.subscription) {
          const customerId = invoice.customer;

          console.log("Subscription payment failed for customer:", customerId);

          // Find the contractor
          const { data: contractor } = await supabaseAdmin
            .from("contractor_profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (contractor) {
            // Mark as past_due - Stripe will retry the payment
            await supabaseAdmin
              .from("contractor_profiles")
              .update({
                subscription_status: "past_due",
              })
              .eq("id", contractor.id);

            console.log(
              "Marked subscription as past_due for contractor:",
              contractor.id
            );
            // You could also send an email notification here
          }
        }
        break;
      }

      // ============================================
      // OTHER EVENTS
      // ============================================
      case "checkout.session.expired": {
        console.log("Checkout session expired:", event.data.object.id);
        break;
      }

      case "payment_intent.payment_failed": {
        console.log("Payment intent failed:", event.data.object.id);
        break;
      }

      default:
        // Log unhandled events for debugging
        console.log("Unhandled event type:", event.type);
    }

    // Return 200 to acknowledge receipt of the event
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
