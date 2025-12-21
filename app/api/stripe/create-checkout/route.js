/*
  Stripe Checkout Session API
  ---------------------------
  Creates a Stripe Checkout session for paying an invoice.
  
  This is called when a client clicks "Pay Invoice" from the payment page.
  It creates a secure Stripe-hosted checkout page with the invoice details.
  
  Flow:
  1. Receive invoice ID
  2. Fetch invoice details from database
  3. Create Stripe Checkout session with invoice amount
  4. Return the checkout URL for redirect
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Check if Stripe key exists
const stripeKey = process.env.STRIPE_SECRET_KEY;
console.log("Stripe key exists:", !!stripeKey);
console.log("Stripe key starts with:", stripeKey ? stripeKey.substring(0, 10) + "..." : "NOT FOUND");

// Initialize Stripe with secret key
// In test mode, this will be sk_test_...
const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: "2023-10-16",
}) : null;

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

    // Fetch the invoice with client details
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

    // Get the app URL for success/cancel redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create the Stripe Checkout session
    // Using Stripe's hosted checkout page for security and ease of use
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      // You can add 'us_bank_account' here later for ACH payments
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
            unit_amount: Math.round((invoice.total || 0) * 100),
          },
          quantity: 1,
        },
      ],
      
      // Store invoice ID in metadata so we can update it when paid
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number || "",
      },

      // Where to redirect after payment
      // Include session_id so we can verify and mark invoice as paid
      success_url: `${appUrl}/pay/${invoiceId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pay/${invoiceId}?canceled=true`,
    });

    // Return the checkout session URL
    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session: " + error.message },
      { status: 500 }
    );
  }
}

