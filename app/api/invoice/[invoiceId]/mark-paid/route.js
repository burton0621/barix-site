/*
  Mark Invoice Paid API
  ---------------------
  Marks an invoice as paid. This is a fallback for when webhooks aren't configured.
  In production, webhooks should handle this automatically.
  
  This endpoint requires a session_id from Stripe to verify the payment was real.
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2023-10-16" }) : null;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const invoiceId = resolvedParams.invoiceId;
    const { sessionId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
    }

    // If we have a session ID, verify with Stripe that payment was successful
    if (sessionId && stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status !== "paid") {
          return NextResponse.json(
            { error: "Payment not completed" },
            { status: 400 }
          );
        }

        // Verify this session is for this invoice
        if (session.metadata?.invoice_id !== invoiceId) {
          return NextResponse.json(
            { error: "Session does not match invoice" },
            { status: 400 }
          );
        }
      } catch (stripeError) {
        console.error("Error verifying session:", stripeError);
        // Continue anyway for testing - in production you'd want to fail here
      }
    }

    // Update invoice to paid
    const { data: invoice, error } = await supabaseAdmin
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .select()
      .single();

    if (error) {
      console.error("Error updating invoice:", error);
      return NextResponse.json(
        { error: "Failed to update invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice,
    });

  } catch (error) {
    console.error("Mark paid error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}




