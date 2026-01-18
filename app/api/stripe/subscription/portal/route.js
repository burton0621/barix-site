/*
  Stripe Customer Portal API
  --------------------------
  Creates a session for the Stripe Customer Portal where users can:
  - View their subscription details
  - Update payment method
  - Cancel their subscription
  - View invoice history
  
  This uses Stripe's hosted portal, so we don't have to build any of this UI.
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
    const { contractorId } = await request.json();

    if (!contractorId) {
      return NextResponse.json(
        { error: "Contractor ID is required" },
        { status: 400 }
      );
    }

    // Get the contractor's Stripe customer ID
    const { data: contractor, error: fetchError } = await supabaseAdmin
      .from("contractor_profiles")
      .select("stripe_customer_id")
      .eq("id", contractorId)
      .single();

    if (fetchError || !contractor?.stripe_customer_id) {
      console.error("Error fetching contractor:", fetchError);
      return NextResponse.json(
        { error: "No subscription found. Please subscribe first." },
        { status: 404 }
      );
    }

    // Get the app URL for the return redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create a portal session
    // This redirects the user to Stripe's hosted billing portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: contractor.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });

    console.log("Created portal session for customer:", contractor.stripe_customer_id);

    return NextResponse.json({
      success: true,
      portalUrl: portalSession.url,
    });

  } catch (error) {
    console.error("Customer portal error:", error);
    return NextResponse.json(
      { error: "Failed to open billing portal: " + error.message },
      { status: 500 }
    );
  }
}

