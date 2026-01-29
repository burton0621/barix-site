/*
  Stripe Connect Callback Handler
  -------------------------------
  This route handles the redirect from Stripe after a contractor completes
  (or exits) the onboarding process. We check the account status and update
  our database accordingly, then redirect them back to their profile page.
  
  Note: Just because they returned here doesn't mean onboarding is complete.
  We need to check the account status with Stripe to know for sure.
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
    const accountId = searchParams.get("account");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!accountId) {
      console.error("No account ID in callback");
      return NextResponse.redirect(`${appUrl}/profile?stripe_error=missing_account`);
    }

    console.log("Connect callback received for account:", accountId);

    // Retrieve the account from Stripe to check its current status
    const account = await stripe.accounts.retrieve(accountId);

    // Check if the account can receive payouts and accept charges
    // Both of these need to be true for full functionality
    const payoutsEnabled = account.payouts_enabled;
    const chargesEnabled = account.charges_enabled;
    
    // Get any outstanding requirements that Stripe needs from the user
    const requirements = account.requirements;
    const hasOutstandingRequirements = 
      (requirements?.currently_due?.length > 0) || 
      (requirements?.eventually_due?.length > 0);

    console.log("Account status:", {
      payoutsEnabled,
      chargesEnabled,
      hasOutstandingRequirements,
      currentlyDue: requirements?.currently_due,
    });

    // Update our database with the current account status
    const { error: updateError } = await supabaseAdmin
      .from("contractor_profiles")
      .update({
        stripe_payouts_enabled: payoutsEnabled,
        stripe_charges_enabled: chargesEnabled,
        stripe_requirements: requirements,
      })
      .eq("stripe_account_id", accountId);

    if (updateError) {
      console.error("Error updating contractor profile:", updateError);
    }

    // Determine the redirect URL based on account status
    // We add query parameters so the frontend can show appropriate messages
    let redirectUrl = `${appUrl}/profile`;
    
    if (payoutsEnabled && chargesEnabled) {
      // Fully set up and ready to receive payments
      redirectUrl += "?stripe_status=complete";
    } else if (hasOutstandingRequirements) {
      // Some information still needed
      redirectUrl += "?stripe_status=pending";
    } else {
      // Verification in progress
      redirectUrl += "?stripe_status=processing";
    }

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("Connect callback error:", error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/profile?stripe_error=callback_failed`);
  }
}

