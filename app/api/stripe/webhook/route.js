/*
  Stripe Webhook Handler
  ----------------------
  Handles webhook events from Stripe, particularly payment success events.
  
  When a payment is completed, Stripe sends a webhook to this endpoint.
  We verify the webhook signature, then update the invoice status to "paid".
  
  Important: This endpoint must be configured in your Stripe Dashboard:
  Developers > Webhooks > Add endpoint
  URL: https://yourdomain.com/api/stripe/webhook
  Events: checkout.session.completed
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

    // Handle the event based on type
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        
        // Get the invoice ID from the metadata we stored when creating the session
        const invoiceId = session.metadata?.invoice_id;
        
        if (!invoiceId) {
          console.error("No invoice ID in session metadata");
          break;
        }

        console.log(`Payment successful for invoice: ${invoiceId}`);

        // Update the invoice status to paid
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
          // Still return 200 so Stripe doesn't retry
          // We can handle this manually if needed
        } else {
          console.log(`Invoice ${invoiceId} marked as paid`);
        }

        break;
      }

      case "checkout.session.expired": {
        // Session expired without payment - could log this or notify
        console.log("Checkout session expired:", event.data.object.id);
        break;
      }

      case "payment_intent.payment_failed": {
        // Payment failed - could notify the business owner
        console.log("Payment failed:", event.data.object.id);
        break;
      }

      default:
        // Unexpected event type - log it but don't error
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt of the event
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Disable body parsing - Stripe needs the raw body
export const config = {
  api: {
    bodyParser: false,
  },
};




