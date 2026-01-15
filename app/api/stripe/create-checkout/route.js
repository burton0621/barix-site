/*
  Stripe Checkout Session API (with Connect)
  -------------------------------------------
  Creates a Stripe Checkout session for paying an invoice.
  
  With Stripe Connect, payments are routed to the contractor's connected
  account. Barix can optionally take a platform fee from each transaction.
  
  Flow:
  1. Receive invoice ID
  2. Fetch invoice details and contractor's Stripe account ID
  3. Create Stripe Checkout session with payment routed to contractor
  4. Return the checkout URL for redirect
  
  If the contractor hasn't connected their Stripe account yet, we still
  create the checkout but the payment goes to the platform account.
  The contractor will need to connect Stripe to receive future payouts.
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Initialize Stripe with secret key from environment
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey 
  ? new Stripe(stripeKey, { apiVersion: "2023-10-16" }) 
  : null;

// Supabase admin client for database access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Platform fee percentage - this is what Barix keeps from each transaction
// Set to 0 if you don't want to charge a platform fee
const PLATFORM_FEE_PERCENT = 2.9; // 2.9% goes to Barix

export async function POST(request) {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      console.error("Stripe not initialized - STRIPE_SECRET_KEY missing from environment");
      return NextResponse.json(
        { error: "Payment system not configured. Please add STRIPE_SECRET_KEY to .env.local" },
        { status: 500 }
      );
    }

    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Fetch the invoice with client details AND the contractor's Stripe account
    // We need the contractor_id to look up their connected Stripe account
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select(`
        *,
        clients:client_id (
          id,
          name,
          email
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Error fetching invoice:", invoiceError);
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Check if invoice is already paid
    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "This invoice has already been paid" },
        { status: 400 }
      );
    }

    // Get the contractor's connected Stripe account ID
    // This is needed to route the payment to their bank account
    let connectedAccountId = null;
    if (invoice.contractor_id) {
      const { data: contractor, error: contractorError } = await supabaseAdmin
        .from("contractor_profiles")
        .select("stripe_account_id, stripe_payouts_enabled")
        .eq("id", invoice.contractor_id)
        .single();

      if (!contractorError && contractor?.stripe_account_id && contractor?.stripe_payouts_enabled) {
        connectedAccountId = contractor.stripe_account_id;
      }
    }

    // Get the app URL for success/cancel redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Calculate amounts in cents for Stripe
    const totalAmountCents = Math.round((invoice.total || 0) * 100);
    
    // Calculate the platform fee (what Barix keeps)
    // Only apply if we're routing to a connected account
    const platformFeeCents = connectedAccountId 
      ? Math.round(totalAmountCents * (PLATFORM_FEE_PERCENT / 100))
      : 0;

    // Build the checkout session configuration
    const sessionConfig = {
      payment_method_types: ["card"],
      // You can add 'us_bank_account' here for ACH payments
      mode: "payment",
      
      // Customer info - pre-fill if we have it
      customer_email: invoice.clients?.email || undefined,
      
      // Line items shown on checkout page
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice ${invoice.invoice_number || invoiceId}`,
              description: invoice.clients?.name 
                ? `Services for ${invoice.clients.name}`
                : "Professional services",
            },
            // Stripe expects amount in cents
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],
      
      // Store invoice ID in metadata so we can update it when paid
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number || "",
        contractor_id: invoice.contractor_id || "",
      },

      // Where to redirect after payment
      success_url: `${appUrl}/pay/${invoiceId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pay/${invoiceId}?canceled=true`,
    };

    // If we have a connected account, route the payment there
    // The platform fee goes to Barix, the rest goes to the contractor
    if (connectedAccountId) {
      sessionConfig.payment_intent_data = {
        // This tells Stripe to transfer funds to the connected account
        transfer_data: {
          destination: connectedAccountId,
        },
        // The platform fee that Barix keeps from this transaction
        application_fee_amount: platformFeeCents,
      };
    }

    // Create the Stripe Checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Return the checkout session URL
    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      // Include info about whether this is going to a connected account
      connectedAccount: !!connectedAccountId,
    });

  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session: " + error.message },
      { status: 500 }
    );
  }
}
