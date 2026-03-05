import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // important for cron
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { invoiceId, reminderType } = body; // "before_due" | "after_due"

    if (!invoiceId || !reminderType) {
      return NextResponse.json(
        { error: "invoiceId and reminderType are required" },
        { status: 400 }
      );
    }

    // 1) Load invoice (match send-invoice shape)
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
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.paid_at) {
      return NextResponse.json({ ok: true, skipped: "already_paid" });
    }

    // Don’t send reminders for estimates
    const isEstimate = invoice.document_type === "estimate";
    if (isEstimate) {
      return NextResponse.json({ ok: true, skipped: "estimate_not_supported" });
    }

    if (!invoice.clients?.email) {
      return NextResponse.json(
        { error: "Client has no email address." },
        { status: 400 }
      );
    }

    // 2) Fetch line items (so reminder looks identical)
    const { data: lineItems, error: lineItemsError } = await supabaseAdmin
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("position", { ascending: true });

    if (lineItemsError) {
      return NextResponse.json(
        { error: "Failed to fetch invoice line items" },
        { status: 500 }
      );
    }

    // 3) Fetch contractor/company profile (match send-invoice)
    const { data: profile } = await supabaseAdmin
      .from("contractor_profiles")
      .select("company_name, business_email, business_phone")
      .eq("id", invoice.owner_id)
      .single();

    const businessName = profile?.company_name || "Your Service Provider";
    const businessEmail = profile?.business_email || "";
    const businessPhone = profile?.business_phone || "";

    // 4) URLs (same behavior as invoice email)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const actionUrl = `${appUrl}/pay/${invoiceId}`; // reminders always point to pay page
    const viewUrl = `${appUrl}/invoice/${invoiceId}`; // optional secondary link

    // Format helpers (copied from send-invoice)
    const formatDate = (dateStr) => {
      if (!dateStr) return "N/A";
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount || 0);
    };

    // --- Totals breakdown (same as send-invoice) ---
    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

    const lineItemsTotal = round2(
      (lineItems || []).reduce((sum, it) => sum + Number(it.line_total || 0), 0)
    );

    const indirectEnabled = !!invoice.enable_indirect_materials;
    const indirectType =
      invoice.indirect_materials_default_type === "percent" ? "percent" : "amount";

    const indirectPercent = Number(invoice.indirect_materials_percent || 0);
    const indirectAmount = Number(invoice.indirect_materials_amount || 0);

    let indirectCharge = 0;
    if (indirectEnabled) {
      if (indirectType === "percent") {
        const pct = Math.min(100, Math.max(0, indirectPercent));
        indirectCharge = round2((lineItemsTotal * pct) / 100);
      } else {
        indirectCharge = round2(Math.max(0, indirectAmount));
      }
    }

    const computedSubtotal = round2(lineItemsTotal + indirectCharge);
    const storedSubtotal = round2(Number(invoice.subtotal || 0));
    const subtotalForDisplay = storedSubtotal || computedSubtotal;

    // Build line items HTML (same as send-invoice)
    const lineItemsHtml = (lineItems || [])
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left;">
            <strong>${item.name || "Service"}</strong>
            ${
              item.description
                ? `<br><span style="color: #6b7280; font-size: 13px;">${item.description}</span>`
                : ""
            }
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${
            item.quantity
          }</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(
            item.rate
          )}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(
            item.line_total
          )}</td>
        </tr>
      `
      )
      .join("");

    // Build client address (same as send-invoice)
    const clientAddress = [
      invoice.clients.service_address_line1,
      invoice.clients.service_city,
      invoice.clients.service_state,
      invoice.clients.service_postal_code,
    ]
      .filter(Boolean)
      .join(", ");

    const pctLabel =
      indirectType === "percent"
        ? ` (${Math.min(100, Math.max(0, indirectPercent)).toFixed(1)}%)`
        : "";

    const dueDateFormatted = formatDate(invoice.due_date);

    // Reminder-specific text
    const reminderTitle =
      reminderType === "after_due" ? "Past Due Reminder" : "Payment Reminder";

    const reminderBody =
      reminderType === "after_due"
        ? `This is a friendly reminder that invoice <strong>${invoice.invoice_number || ""}</strong> was due on <strong>${dueDateFormatted}</strong>.`
        : `This is a friendly reminder that invoice <strong>${invoice.invoice_number || ""}</strong> is due on <strong>${dueDateFormatted}</strong>.`;

    const subject =
      reminderType === "after_due"
        ? `Past Due Reminder: Invoice ${invoice.invoice_number || ""} from ${businessName}`
        : `Reminder: Invoice ${invoice.invoice_number || ""} from ${businessName}`;

    // 5) Email HTML — copied from send-invoice, with only the “Greeting” paragraph swapped
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
          <h1 style="color: white; margin: 0; font-size: 24px;">${reminderTitle} from ${businessName}</h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          
          <!-- Greeting -->
          <p style="font-size: 16px; margin-top: 0;">Hi ${invoice.clients.name},</p>
          <p style="font-size: 16px;">${reminderBody}</p>
          <p style="font-size: 16px; color: #6b7280; margin-top: 10px;">Please find your invoice details below.</p>
          
          <!-- Document Summary Box -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0;">
                  <strong>Invoice Number:</strong>
                </td>
                <td style="padding: 4px 0; text-align: right;">
                  ${invoice.invoice_number || "N/A"}
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">
                  <strong>Issue Date:</strong>
                </td>
                <td style="padding: 4px 0; text-align: right;">
                  ${formatDate(invoice.issue_date)}
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">
                  <strong>Due Date:</strong>
                </td>
                <td style="padding: 4px 0; text-align: right; color: #dc2626; font-weight: 600;">
                  ${dueDateFormatted}
                </td>
              </tr>
              ${
                clientAddress
                  ? `
              <tr>
                <td style="padding: 4px 0;">
                  <strong>Service Address:</strong>
                </td>
                <td style="padding: 4px 0; text-align: right;">
                  ${clientAddress}
                </td>
              </tr>
              `
                  : ""
              }
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
                <td style="padding: 6px 16px; text-align: right; color: #6b7280;">Line items:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 500;">${formatCurrency(
                  lineItemsTotal
                )}</td>
              </tr>

              ${
                indirectEnabled && indirectCharge > 0
                  ? `
              <tr>
                <td style="padding: 6px 16px; text-align: right; color: #6b7280;">Indirect materials${pctLabel}:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 500;">${formatCurrency(
                  indirectCharge
                )}</td>
              </tr>
              `
                  : ""
              }

              <tr>
                <td style="padding: 6px 16px; text-align: right; color: #6b7280;">Subtotal:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatCurrency(
                  subtotalForDisplay
                )}</td>
              </tr>
              <tr>
                <td style="padding: 6px 16px; text-align: right; color: #6b7280;">Tax (${(
                  (invoice.tax_rate || 0) * 100
                ).toFixed(0)}%):</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 500;">${formatCurrency(
                  invoice.tax_amount
                )}</td>
              </tr>
              <tr style="font-size: 18px;">
                <td style="padding: 12px 16px; text-align: right; border-top: 2px solid #e5e7eb; font-weight: 600;">Total Due:</td>
                <td style="padding: 12px 0; text-align: right; border-top: 2px solid #e5e7eb; font-weight: 700; color: #0a2540;">${formatCurrency(
                  invoice.total
                )}</td>
              </tr>
            </table>
          </div>
          
          ${
            invoice.notes
              ? `
          <!-- Notes -->
          <div style="margin-top: 24px; padding: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;">
            <strong style="color: #92400e;">Note:</strong>
            <p style="margin: 8px 0 0 0; color: #78350f;">${invoice.notes}</p>
          </div>
          `
              : ""
          }
          
          <!-- Reminder Payment CTA -->
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #6b7280; margin-bottom: 20px;">
              ${
                reminderType === "after_due"
                  ? "Your invoice is past due. Click below to pay securely online:"
                  : "Click the button below to pay securely online:"
              }
            </p>
            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">
              Pay ${formatCurrency(invoice.total)} Now
            </a>
            <p style="color: #9ca3af; margin-top: 16px; font-size: 13px;">Or view your invoice: ${viewUrl}</p>
          </div>
          
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

    // 6) Send
    const { error: sendErr } = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ||
        "Barix Billing <onboarding@resend.dev>",
      to: invoice.clients.email,
      subject,
      html: emailHtml,
    });

    if (sendErr) {
      return NextResponse.json({ error: sendErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
