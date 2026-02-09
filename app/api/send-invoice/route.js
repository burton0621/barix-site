/*
  Send Invoice/Estimate Email API Route
  --------------------------------------
  This API endpoint sends an invoice OR estimate email to a client.
  
  For Invoices:
  - Sends an email with a "Pay Now" button linking to the payment page
  - Updates status to "sent" if it was a draft
  
  For Estimates:
  - Sends an email with a "View Estimate" button linking to the estimate page
  - Client can accept or decline from that page
  - Updates status to "sent" if it was a draft
  
  The email includes:
  - Document number and dates
  - Line items with descriptions, quantities, and amounts
  - Subtotal, tax, and total
  - Any notes
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Create Supabase client with service role for fetching data
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Parse the request body
    const { invoiceId, userId } = await request.json();

    // Validate required fields
    if (!invoiceId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: invoiceId, userId" },
        { status: 400 }
      );
    }

    // Fetch the invoice/estimate with client details
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select(`
        *,
        document_type,
        clients:client_id (
          id,
          name,
          email,
          service_address_line1,
          service_city,
          service_state,
          service_postal_code
        )
      `)
      .eq("id", invoiceId)
      .eq("owner_id", userId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Error fetching invoice:", invoiceError);
      return NextResponse.json(
        { error: "Invoice not found or you don't have permission to access it" },
        { status: 404 }
      );
    }

    // Check if client has an email address
    if (!invoice.clients?.email) {
      return NextResponse.json(
        { error: "This client doesn't have an email address. Please add one in the Clients page first." },
        { status: 400 }
      );
    }

    // Fetch the line items for this invoice
    const { data: lineItems, error: lineItemsError } = await supabaseAdmin
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("position", { ascending: true });

    if (lineItemsError) {
      console.error("Error fetching line items:", lineItemsError);
      return NextResponse.json(
        { error: "Failed to fetch invoice line items" },
        { status: 500 }
      );
    }

    // Fetch the contractor/company profile to get business name
    const { data: profile } = await supabaseAdmin
      .from("contractor_profiles")
      .select("company_name, business_email, business_phone")
      .eq("id", userId)
      .single();

    const businessName = profile?.company_name || "Your Service Provider";
    const businessEmail = profile?.business_email || "";
    const businessPhone = profile?.business_phone || "";

    // Determine if this is an estimate or invoice
    const isEstimate = invoice.document_type === "estimate";
    const documentLabel = isEstimate ? "Estimate" : "Invoice";
    const documentLabelLower = isEstimate ? "estimate" : "invoice";

    // Build the appropriate URL based on document type
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // Estimates link to the estimate page, invoices link to the payment page
    const actionUrl = isEstimate 
      ? `${appUrl}/estimate/${invoiceId}` 
      : `${appUrl}/pay/${invoiceId}`;

    // Format the dates nicely
    const formatDate = (dateStr) => {
      if (!dateStr) return "N/A";
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount || 0);
    };

    // Build the line items HTML
    const lineItemsHtml = lineItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left;">
            <strong>${item.name || "Service"}</strong>
            ${item.description ? `<br><span style="color: #6b7280; font-size: 13px;">${item.description}</span>` : ""}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.rate)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.line_total)}</td>
        </tr>
      `
      )
      .join("");

    // Build the client address
    const clientAddress = [
      invoice.clients.service_address_line1,
      invoice.clients.service_city,
      invoice.clients.service_state,
      invoice.clients.service_postal_code,
    ]
      .filter(Boolean)
      .join(", ");

    // Build the email HTML - content varies based on whether this is an estimate or invoice
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0a2540, #194d7a); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${documentLabel} from ${businessName}</h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          
          <!-- Greeting -->
          <p style="font-size: 16px; margin-top: 0;">Hi ${invoice.clients.name},</p>
          <p style="font-size: 16px;">${isEstimate 
            ? "Thank you for your interest! Please find your estimate details below." 
            : "Please find your invoice details below."}</p>
          
          <!-- Document Summary Box -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0;">
                  <strong>${documentLabel} Number:</strong>
                </td>
                <td style="padding: 4px 0; text-align: right;">
                  ${invoice.invoice_number || "N/A"}
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">
                  <strong>${isEstimate ? "Estimate Date:" : "Issue Date:"}</strong>
                </td>
                <td style="padding: 4px 0; text-align: right;">
                  ${formatDate(invoice.issue_date)}
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">
                  <strong>${isEstimate ? "Valid Until:" : "Due Date:"}</strong>
                </td>
                <td style="padding: 4px 0; text-align: right; color: #dc2626; font-weight: 600;">
                  ${formatDate(invoice.due_date)}
                </td>
              </tr>
              ${clientAddress ? `
              <tr>
                <td style="padding: 4px 0;">
                  <strong>Service Address:</strong>
                </td>
                <td style="padding: 4px 0; text-align: right;">
                  ${clientAddress}
                </td>
              </tr>
              ` : ""}
            </table>
          </div>
          
          <!-- Line Items Table -->
          <h3 style="margin: 24px 0 12px 0; font-size: 16px; color: #374151;">Services</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; text-align: left;">Description</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; text-align: center; width: 60px;">Qty</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; text-align: right; width: 80px;">Rate</th>
                <th style="padding: 12px; border-bottom: 2px solid #e5e7eb; text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
          </table>
          
          <!-- Totals -->
          <div style="margin-top: 24px; text-align: right;">
            <table style="margin-left: auto; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 16px; text-align: right; color: #6b7280;">Subtotal:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 500;">${formatCurrency(invoice.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 16px; text-align: right; color: #6b7280;">Tax (${((invoice.tax_rate || 0) * 100).toFixed(0)}%):</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 500;">${formatCurrency(invoice.tax_amount)}</td>
              </tr>
              <tr style="font-size: 18px;">
                <td style="padding: 12px 16px; text-align: right; border-top: 2px solid #e5e7eb; font-weight: 600;">${isEstimate ? "Total Estimate:" : "Total Due:"}</td>
                <td style="padding: 12px 0; text-align: right; border-top: 2px solid #e5e7eb; font-weight: 700; color: #0a2540;">${formatCurrency(invoice.total)}</td>
              </tr>
            </table>
          </div>
          
          ${invoice.notes ? `
          <!-- Notes -->
          <div style="margin-top: 24px; padding: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
            <strong style="color: #92400e;">Note:</strong>
            <p style="margin: 8px 0 0 0; color: #78350f;">${invoice.notes}</p>
          </div>
          ` : ""}
          
          <!-- Call to Action - different for estimates vs invoices -->
          ${isEstimate ? `
          <!-- Estimate CTA -->
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #6b7280; margin-bottom: 20px;">Ready to proceed? Click the button below to accept this estimate:</p>
            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">
              Accept Estimate
            </a>
            <p style="color: #9ca3af; margin-top: 16px; font-size: 13px;">This estimate is valid until ${formatDate(invoice.due_date)}</p>
          </div>
          ` : `
          <!-- Invoice Payment CTA -->
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #6b7280; margin-bottom: 20px;">Click the button below to pay securely online:</p>
            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">
              Pay ${formatCurrency(invoice.total)} Now
            </a>
            <p style="color: #9ca3af; margin-top: 16px; font-size: 13px;">Or visit: ${actionUrl}</p>
          </div>
          `}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          
          <!-- Contact Info -->
          <div style="text-align: center; color: #6b7280; font-size: 13px;">
            <p style="margin: 0 0 4px 0;"><strong>${businessName}</strong></p>
            ${businessEmail ? `<p style="margin: 0 0 4px 0;">Email: ${businessEmail}</p>` : ""}
            ${businessPhone ? `<p style="margin: 0;">Phone: ${businessPhone}</p>` : ""}
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; border-radius: 0 0 12px 12px;">
          <p style="margin: 0;">Sent via Barix Billing</p>
        </div>
        
      </body>
      </html>
    `;

    // Send the email via Resend with appropriate subject based on document type
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Barix Billing <onboarding@resend.dev>",
      to: invoice.clients.email,
      subject: `${documentLabel} ${invoice.invoice_number || ""} from ${businessName}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return NextResponse.json(
        { error: "Failed to send email: " + emailError.message },
        { status: 500 }
      );
    }

    // Always update status to "sent" after successful email delivery
    // This handles both new documents (draft -> sent) and re-sends
    const previousStatus = invoice.status;
    const { error: updateError } = await supabaseAdmin
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoiceId);

    if (updateError) {
      console.error("Error updating status:", updateError);
      // Don't fail the request since the email was sent successfully
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      emailId: emailData?.id,
      clientEmail: invoice.clients.email,
      statusUpdated: previousStatus !== "sent",
      documentType: invoice.document_type || "invoice",
    });

  } catch (error) {
    console.error("Send Invoice API error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}

