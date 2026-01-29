/*
  Public Invoice API
  ------------------
  Fetches invoice details for the public payment page.
  This is a PUBLIC endpoint - no authentication required.
  The invoice ID acts as a secure token.
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    // In Next.js 13+, params may need to be awaited
    const resolvedParams = await params;
    const invoiceId = resolvedParams.invoiceId;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    console.log("Fetching invoice:", invoiceId);

    // Fetch invoice with client data
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select(`
        id,
        owner_id,
        invoice_number,
        issue_date,
        due_date,
        status,
        notes,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        clients:client_id (
          id,
          name,
          email
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError) {
      console.error("Error fetching invoice:", invoiceError);
      return NextResponse.json(
        { error: "Database error: " + invoiceError.message },
        { status: 500 }
      );
    }

    if (!invoice) {
      console.log("No invoice found with ID:", invoiceId);
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Fetch the contractor/business profile separately since there's no FK relationship
    let businessName = "Your Service Provider";
    if (invoice.owner_id) {
      const { data: profile } = await supabaseAdmin
        .from("contractor_profiles")
        .select("business_name")
        .eq("id", invoice.owner_id)
        .single();
      
      if (profile?.business_name) {
        businessName = profile.business_name;
      }
    }

    // Fetch line items separately
    const { data: lineItems, error: lineItemsError } = await supabaseAdmin
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("position", { ascending: true });

    if (lineItemsError) {
      console.error("Error fetching line items:", lineItemsError);
    }

    // Combine invoice with line items and business info
    const fullInvoice = {
      ...invoice,
      line_items: lineItems || [],
      contractor_profiles: { business_name: businessName },
    };

    return NextResponse.json({
      success: true,
      invoice: fullInvoice,
    });

  } catch (error) {
    console.error("Invoice API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

