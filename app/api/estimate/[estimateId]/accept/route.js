/*
  Accept Estimate API
  -------------------
  When a client accepts an estimate:
  1. Update the estimate status to "accepted"
  2. Record the acceptance timestamp
  3. Create a new invoice from the estimate with status "pending"
  
  The "pending" status signals to the business owner that they need to review
  and send the invoice to the client.
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/*
  Generates a unique invoice number for the new invoice.
  Uses INV- prefix to distinguish from EST- prefix of estimates.
*/
function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;

  return `INV-${year}${month}${day}-${rand}`;
}

export async function POST(request, { params }) {
  const { estimateId } = await params;

  if (!estimateId) {
    return NextResponse.json(
      { error: "Estimate ID is required" },
      { status: 400 }
    );
  }

  try {
    // First, fetch the estimate to make sure it exists and hasn't been processed
    const { data: estimate, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", estimateId)
      .single();

    if (fetchError || !estimate) {
      console.error("Error fetching estimate:", fetchError);
      return NextResponse.json(
        { error: "Estimate not found" },
        { status: 404 }
      );
    }

    // Check if this is actually an estimate
    if (estimate.document_type !== "estimate") {
      return NextResponse.json(
        { error: "This document is not an estimate" },
        { status: 400 }
      );
    }

    // Check if the estimate has already been processed
    if (estimate.status === "accepted") {
      return NextResponse.json(
        { error: "This estimate has already been accepted" },
        { status: 400 }
      );
    }

    if (estimate.status === "declined") {
      return NextResponse.json(
        { error: "This estimate has already been declined" },
        { status: 400 }
      );
    }

    // Update the estimate status to "accepted"
    const { error: updateError } = await supabaseAdmin
      .from("invoices")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", estimateId);

    if (updateError) {
      console.error("Error updating estimate status:", updateError);
      return NextResponse.json(
        { error: "Failed to update estimate status" },
        { status: 500 }
      );
    }

    // Fetch line items from the estimate
    const { data: lineItems, error: lineItemsError } = await supabaseAdmin
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", estimateId)
      .order("line_order", { ascending: true });

    if (lineItemsError) {
      console.error("Error fetching line items:", lineItemsError);
      // We'll continue without line items rather than failing completely
    }

    // Create a new invoice from the estimate
    const { data: newInvoice, error: createError } = await supabaseAdmin
      .from("invoices")
      .insert({
        owner_id: estimate.owner_id,
        client_id: estimate.client_id,
        invoice_number: generateInvoiceNumber(),
        issue_date: new Date().toISOString().split("T")[0], // Today's date
        due_date: estimate.due_date, // Keep the same due date
        status: "pending", // Pending means the business owner needs to take action
        notes: estimate.notes,
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        total: estimate.total,
        document_type: "invoice",
        converted_from_id: estimateId, // Link back to the original estimate
      })
      .select("*")
      .single();

    if (createError) {
      console.error("Error creating invoice from estimate:", createError);
      return NextResponse.json(
        { error: "Failed to create invoice from estimate" },
        { status: 500 }
      );
    }

    // Copy line items to the new invoice
    if (lineItems && lineItems.length > 0) {
      const newLineItems = lineItems.map((item, index) => ({
        invoice_id: newInvoice.id,
        service_id: item.service_id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        total: item.total,
        line_order: index,
      }));

      const { error: lineItemsCreateError } = await supabaseAdmin
        .from("invoice_line_items")
        .insert(newLineItems);

      if (lineItemsCreateError) {
        console.error("Error copying line items:", lineItemsCreateError);
        // The invoice was created, so we'll log this but not fail the request
      }
    }

    return NextResponse.json({
      success: true,
      message: "Estimate accepted and invoice created",
      invoiceId: newInvoice.id,
      invoiceNumber: newInvoice.invoice_number,
    });
  } catch (error) {
    console.error("Unexpected error in accept estimate API:", error);
    return NextResponse.json(
      { error: "Failed to process estimate acceptance" },
      { status: 500 }
    );
  }
}



