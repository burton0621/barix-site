/*
  Stripe Checkout Session API (with Connect – direct charges)
  -----------------------------------------------------------
  Creates a Stripe Checkout session for paying an invoice.
  
  Uses direct charges: the charge is created on the contractor's connected
  account. With application_fee_amount: 0, the contractor receives the
  full amount minus Stripe's processing fee; the platform keeps nothing.
  
  Flow:
  1. Receive invoice ID
  2. Fetch invoice details and contractor's Stripe account ID
  3. Create Stripe Checkout session on the connected account (or platform if none)
  4. Return the checkout URL for redirect
  
  If the contractor hasn't connected their Stripe account yet, we still
  create the checkout but the payment goes to the platform account.
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

    // Build the checkout session configuration
    const sessionConfig = {
      payment_method_types: ["card", "us_bank_account"],
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
        connected_account_id: connectedAccountId || "",
      },

      // Where to redirect after payment
      success_url: `${appUrl}/pay/${invoiceId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pay/${invoiceId}?canceled=true`,
    };

    // Direct charge: create the charge on the contractor's connected account.
    // With application_fee_amount: 0, the contractor receives (invoice − Stripe fee); platform keeps nothing.
    if (connectedAccountId) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: 0,
      };
    }

    // Create the Stripe Checkout session (on connected account for direct charge, else on platform)
    const createOptions = connectedAccountId ? { stripeAccount: connectedAccountId } : {};
    const session = await stripe.checkout.sessions.create(sessionConfig, createOptions);

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
