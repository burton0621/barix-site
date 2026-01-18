/*
  Account Deletion API
  --------------------
  Handles complete account deletion including:
  1. Cancel any active Stripe subscription
  2. Delete Stripe customer (optional - keeps for records)
  3. Delete all user data from Supabase
  4. Delete the auth user
  
  This is irreversible! All data will be permanently deleted.
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
    const { contractorId, userId, confirmPhrase } = await request.json();

    // Require confirmation phrase to prevent accidental deletion
    if (confirmPhrase !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        { error: "Please type 'DELETE MY ACCOUNT' to confirm" },
        { status: 400 }
      );
    }

    if (!contractorId || !userId) {
      return NextResponse.json(
        { error: "Missing required identifiers" },
        { status: 400 }
      );
    }

    console.log("Starting account deletion for:", { contractorId, userId });

    // Step 1: Get the contractor's Stripe info
    const { data: contractor, error: fetchError } = await supabaseAdmin
      .from("contractor_profiles")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", contractorId)
      .single();

    if (fetchError) {
      console.error("Error fetching contractor:", fetchError);
      // Continue anyway - they might not have a profile yet
    }

    // Step 2: Cancel Stripe subscription if exists
    if (contractor?.stripe_subscription_id) {
      try {
        console.log("Canceling Stripe subscription:", contractor.stripe_subscription_id);
        await stripe.subscriptions.cancel(contractor.stripe_subscription_id);
        console.log("Subscription canceled successfully");
      } catch (stripeError) {
        // Log but continue - subscription might already be canceled
        console.error("Error canceling subscription:", stripeError.message);
      }
    }

    // Step 3: Optionally delete Stripe customer
    // Keeping this commented out - better to keep customer for records/refunds
    // if (contractor?.stripe_customer_id) {
    //   try {
    //     await stripe.customers.del(contractor.stripe_customer_id);
    //   } catch (stripeError) {
    //     console.error("Error deleting Stripe customer:", stripeError.message);
    //   }
    // }

    // Step 4: Delete all related data from Supabase
    // Order matters due to foreign key constraints
    
    // Delete invoices and their line items
    const { data: invoices } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("contractor_id", contractorId);
    
    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map(i => i.id);
      
      // Delete line items for all invoices
      await supabaseAdmin
        .from("invoice_line_items")
        .delete()
        .in("invoice_id", invoiceIds);
      
      // Delete invoices
      await supabaseAdmin
        .from("invoices")
        .delete()
        .eq("contractor_id", contractorId);
    }

    // Delete clients
    await supabaseAdmin
      .from("clients")
      .delete()
      .eq("contractor_id", contractorId);

    // Delete services
    await supabaseAdmin
      .from("services")
      .delete()
      .eq("contractor_id", contractorId);

    // Delete team members
    await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("contractor_id", contractorId);

    // Delete contractor-related tables (addresses, licenses, regions)
    await supabaseAdmin
      .from("contractor_addresses")
      .delete()
      .eq("contractor_id", contractorId);

    await supabaseAdmin
      .from("contractor_licenses")
      .delete()
      .eq("contractor_id", contractorId);

    await supabaseAdmin
      .from("contractor_service_regions")
      .delete()
      .eq("contractor_id", contractorId);

    // Delete the contractor profile
    await supabaseAdmin
      .from("contractor_profiles")
      .delete()
      .eq("id", contractorId);

    console.log("All Supabase data deleted");

    // Step 5: Delete the auth user
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error("Error deleting auth user:", deleteUserError);
      return NextResponse.json(
        { error: "Failed to delete user account: " + deleteUserError.message },
        { status: 500 }
      );
    }

    console.log("Auth user deleted successfully");

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });

  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account: " + error.message },
      { status: 500 }
    );
  }
}

