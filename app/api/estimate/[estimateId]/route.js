/*
  Public Estimate API
  -------------------
  Fetches estimate details for the public estimate view page.
  Similar to the invoice API but specifically for estimates.
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase admin client that bypasses RLS for public estimate access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  const { estimateId } = await params;

  // Validate that we have an estimate ID
  if (!estimateId) {
    return NextResponse.json(
      { error: "Estimate ID is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch the estimate (which is stored in the invoices table with document_type = 'estimate')
    const { data: estimate, error: estimateError } = await supabaseAdmin
      .from("invoices")
      .select(`
        id,
        invoice_number,
        issue_date,
        due_date,
        status,
        notes,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        document_type,
        client_id,
        owner_id
      `)
      .eq("id", estimateId)
      .single();

    if (estimateError || !estimate) {
      console.error("Error fetching estimate:", estimateError);
      return NextResponse.json(
        { error: "Estimate not found" },
        { status: 404 }
      );
    }

    // Fetch line items for this estimate
    const { data: lineItems, error: lineItemsError } = await supabaseAdmin
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", estimateId)
      .order("line_order", { ascending: true });

    if (lineItemsError) {
      console.error("Error fetching line items:", lineItemsError);
    }

    // Fetch client details
    let client = null;
    if (estimate.client_id) {
      const { data: clientData, error: clientError } = await supabaseAdmin
        .from("clients")
        .select("id, name, email, phone, address")
        .eq("id", estimate.client_id)
        .single();

      if (!clientError && clientData) {
        client = clientData;
      }
    }

    // Fetch contractor/business owner details
    let contractor = null;
    if (estimate.owner_id) {
      const { data: contractorData, error: contractorError } = await supabaseAdmin
        .from("contractor_profiles")
        .select("id, business_name, email, phone")
        .eq("id", estimate.owner_id)
        .single();

      if (!contractorError && contractorData) {
        contractor = contractorData;
      }
    }

    // Return the complete estimate data
    return NextResponse.json({
      ...estimate,
      line_items: lineItems || [],
      client,
      contractor,
    });
  } catch (error) {
    console.error("Unexpected error in estimate API:", error);
    return NextResponse.json(
      { error: "Failed to fetch estimate" },
      { status: 500 }
    );
  }
}



