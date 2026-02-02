/*
  Stripe Connect Onboarding API
  -----------------------------
  Creates a Stripe Connect Express account for a contractor and returns
  an onboarding link. The contractor is redirected to Stripe's hosted
  onboarding page where they enter their personal/business info and bank account.
  
  Flow:
  1. Check if contractor already has a Stripe account
  2. If not, create a new Express connected account
  3. Create an Account Link (onboarding URL) from Stripe
  4. Return the URL for the frontend to redirect to
  
  After onboarding, Stripe redirects back to our callback URL.
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Supabase admin client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { contractorId, email, companyName } = await request.json();

    if (!contractorId) {
      return NextResponse.json(
        { error: "Contractor ID is required" },
        { status: 400 }
      );
    }

    // First, check if this contractor already has a Stripe account
    let { data: contractor, error: fetchError } = await supabaseAdmin
      .from("contractor_profiles")
      .select("stripe_account_id, company_name, business_email")
      .eq("id", contractorId)
      .single();

    // If profile doesn't exist, create one
    if (fetchError && fetchError.code === "PGRST116") {
      console.log("Profile not found, creating one for:", contractorId);
      
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("contractor_profiles")
        .insert({
          id: contractorId,
          company_name: companyName || "My Company",
        })
        .select("stripe_account_id, company_name, business_email")
        .single();
      
      if (createError) {
        console.error("Error creating profile:", createError);
        return NextResponse.json(
          { error: "Failed to create contractor profile" },
          { status: 500 }
        );
      }
      
      contractor = newProfile;
    } else if (fetchError) {
      console.error("Error fetching contractor:", fetchError);
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    // Get the user's email - prefer business email, fallback to auth email
    let accountEmail = email || contractor.business_email;
    
    // If no business email, get the auth user's email using contractorId (which IS the user ID)
    if (!accountEmail) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(contractorId);
      accountEmail = authUser?.user?.email;
    }

    if (!accountEmail) {
      return NextResponse.json(
        { error: "Please add an email to your profile before setting up payouts" },
        { status: 400 }
      );
    }

    let stripeAccountId = contractor.stripe_account_id;

    // If a Stripe account ID exists, verify it's still valid in the current Stripe environment
    // (handles cases where we switched from test to live keys, or account was deleted)
    if (stripeAccountId) {
      try {
        await stripe.accounts.retrieve(stripeAccountId);
        console.log("Verified existing Stripe account:", stripeAccountId);
      } catch (verifyError) {
        // Account doesn't exist in current Stripe environment (test vs live mode switch)
        console.log("Stored Stripe account not found, will create new one:", verifyError.message);
        stripeAccountId = null;
        
        // Clear the invalid account ID from database
        await supabaseAdmin
          .from("contractor_profiles")
          .update({ 
            stripe_account_id: null,
            stripe_connected_at: null,
          })
          .eq("id", contractorId);
      }
    }

    // If no valid Stripe account exists, create one
    if (!stripeAccountId) {
      console.log("Creating new Stripe Connect account for contractor:", contractorId);
      
      // Create a new Express connected account
      // Express accounts use Stripe's hosted onboarding, which handles all the
      // identity verification and compliance requirements for us
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: accountEmail,
        capabilities: {
          // Request both card_payments and transfers (required by Stripe)
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          contractor_id: contractorId,
          platform: "barix_billing",
        },
        // Pre-fill info we already have to reduce form fields
        business_profile: {
          name: companyName || contractor.company_name,
          url: null, // Skip website requirement
        },
        // Pre-fill settings to speed up onboarding
        settings: {
          payouts: {
            schedule: {
              interval: "daily", // Fastest payout schedule
            },
          },
        },
      });

      stripeAccountId = account.id;
      console.log("Created Stripe account:", stripeAccountId);

      // Save the Stripe account ID to our database
      const { error: updateError } = await supabaseAdmin
        .from("contractor_profiles")
        .update({ 
          stripe_account_id: stripeAccountId,
          stripe_connected_at: new Date().toISOString(),
        })
        .eq("id", contractorId);

      if (updateError) {
        console.error("Error saving Stripe account ID:", updateError);
        // Continue anyway - the account was created in Stripe
      }
    }

    // Get the app URL for redirects after onboarding completes
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create an Account Link - this is the URL where the contractor will
    // complete their onboarding on Stripe's hosted page
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      // Where to redirect if they need to re-authenticate or refresh the link
      refresh_url: `${appUrl}/api/stripe/connect/refresh?account=${stripeAccountId}`,
      // Where to redirect after successful onboarding
      return_url: `${appUrl}/api/stripe/connect/callback?account=${stripeAccountId}`,
      type: "account_onboarding",
      // Only collect minimum required info - they can add more later if needed
      collect: "currently_due",
    });

    console.log("Created onboarding link for account:", stripeAccountId);

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
      accountId: stripeAccountId,
    });

  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to create onboarding link: " + error.message },
      { status: 500 }
    );
  }
}

