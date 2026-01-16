/*
  Stripe Connect Webhook Handler
  ------------------------------
  Handles webhook events from Stripe related to connected accounts.
  This is separate from the regular payment webhook because Connect
  events have different signatures and purposes.
  
  Key events we handle:
  - account.updated: When a connected account's status changes (verification complete, etc.)
  - payout.paid: When a payout to a contractor's bank succeeds
  - payout.failed: When a payout fails (insufficient funds, bank issue, etc.)
  
  Configure this webhook in Stripe Dashboard:
  Developers > Webhooks > Add endpoint
  URL: https://yourdomain.com/api/stripe/connect-webhook
  Listen to: Events on Connected Accounts
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
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    // Verify the webhook signature using the Connect webhook secret
    // This ensures the request actually came from Stripe
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Connect webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log("Connect webhook received:", event.type);

    // Handle different event types
    switch (event.type) {
      
      // Account status changed - this is the main event we care about
      // Fires when verification completes, requirements change, etc.
      case "account.updated": {
        const account = event.data.object;
        console.log("Account updated:", account.id, {
          payouts_enabled: account.payouts_enabled,
          charges_enabled: account.charges_enabled,
        });

        // Update our database with the new status
        const { error: updateError } = await supabaseAdmin
          .from("contractor_profiles")
          .update({
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_charges_enabled: account.charges_enabled,
            stripe_requirements: account.requirements,
          })
          .eq("stripe_account_id", account.id);

        if (updateError) {
          console.error("Error updating contractor status:", updateError);
        } else {
          console.log("Updated contractor payout status for account:", account.id);
        }
        break;
      }

      // Payout to contractor's bank was successful
      case "payout.paid": {
        const payout = event.data.object;
        console.log("Payout successful:", {
          amount: payout.amount / 100,
          account: event.account,
        });
        // You could log this to a payouts table or send a notification
        break;
      }

      // Payout to contractor's bank failed
      case "payout.failed": {
        const payout = event.data.object;
        console.error("Payout failed:", {
          amount: payout.amount / 100,
          account: event.account,
          failure_code: payout.failure_code,
          failure_message: payout.failure_message,
        });
        // You could notify the contractor or admin about the failure
        break;
      }

      // Account was deauthorized (contractor disconnected their account)
      case "account.application.deauthorized": {
        const account = event.data.object;
        console.log("Account deauthorized:", account.id);

        // Clear the Stripe connection from our database
        const { error: updateError } = await supabaseAdmin
          .from("contractor_profiles")
          .update({
            stripe_account_id: null,
            stripe_payouts_enabled: false,
            stripe_charges_enabled: false,
            stripe_requirements: null,
          })
          .eq("stripe_account_id", account.id);

        if (updateError) {
          console.error("Error clearing contractor Stripe data:", updateError);
        }
        break;
      }

      default:
        // Log unhandled events for debugging, but don't error
        console.log("Unhandled Connect webhook event:", event.type);
    }

    // Always return 200 to acknowledge receipt
    // If we return an error, Stripe will retry the webhook
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("Connect webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Disable body parsing - Stripe needs the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

