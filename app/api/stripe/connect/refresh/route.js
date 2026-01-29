/*
  Stripe Connect Refresh Handler
  ------------------------------
  This route is called when the onboarding link has expired or the user
  needs to restart the onboarding process. We generate a new Account Link
  and redirect them back to Stripe.
  
  Account Links expire after a short time for security reasons, so this
  endpoint allows users to get a fresh link without starting over.
*/

import { NextResponse } from "next/server";
import Stripe from "stripe";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("account");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!accountId) {
      console.error("No account ID in refresh request");
      return NextResponse.redirect(`${appUrl}/profile?stripe_error=missing_account`);
    }

    console.log("Generating new onboarding link for account:", accountId);

    // Create a fresh Account Link for the same account
    // This allows the user to continue or restart their onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/api/stripe/connect/refresh?account=${accountId}`,
      return_url: `${appUrl}/api/stripe/connect/callback?account=${accountId}`,
      type: "account_onboarding",
      collect: "eventually_due",
    });

    // Redirect them directly to the new Stripe onboarding page
    return NextResponse.redirect(accountLink.url);

  } catch (error) {
    console.error("Connect refresh error:", error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/profile?stripe_error=refresh_failed`);
  }
}

