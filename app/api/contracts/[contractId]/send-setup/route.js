import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin, getAuthenticatedUser } from "@/lib/supabase/server";
import { checkRateLimit, apiError } from "@/lib/api/middleware";

const resend = new Resend(process.env.RESEND_API_KEY);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const rateLimit = checkRateLimit(request, { limit: 50 });
    if (!rateLimit.allowed) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return apiError("Unauthorized", 401);
    }

    const { contractId } = params;

    // Fetch the contract with client and contractor info
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("recurring_contracts")
      .select(`
        *,
        clients:client_id (
          id,
          name,
          email
        )
      `)
      .eq("id", contractId)
      .eq("owner_id", user.id)
      .single();

    if (contractError || !contract) {
      return apiError("Contract not found or unauthorized", 404);
    }

    if (!contract.clients?.email) {
      return apiError("Client does not have an email address", 400);
    }

    // Fetch contractor profile for branding
    const { data: profile } = await supabaseAdmin
      .from("contractor_profiles")
      .select("company_name, business_email, business_phone")
      .eq("id", user.id)
      .single();

    const businessName = profile?.company_name || "Your Service Provider";
    const businessEmail = profile?.business_email || "";
    const businessPhone = profile?.business_phone || "";

    // Format amount as currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount || 0);
    };

    // Determine interval label
    const intervalLabel = {
      month: "Month",
      quarter: "Quarter",
      year: "Year",
    }[contract.interval] || contract.interval;

    const intervalDisplay =
      contract.interval_count > 1
        ? `Every ${contract.interval_count} ${intervalLabel.toLowerCase()}s`
        : `Per ${intervalLabel}`;

    // Determine duration display
    let durationDisplay = "Ongoing";
    if (contract.duration_months) {
      if (contract.duration_months < 12) {
        durationDisplay = `${contract.duration_months} months`;
      } else {
        const years = Math.floor(contract.duration_months / 12);
        const months = contract.duration_months % 12;
        if (months === 0) {
          durationDisplay = `${years} year${years > 1 ? "s" : ""}`;
        } else {
          durationDisplay = `${years} year${years > 1 ? "s" : ""} and ${months} month${months > 1 ? "s" : ""}`;
        }
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const setupUrl = `${appUrl}/contract/${contractId}/setup`;

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
          <h1 style="color: white; margin: 0; font-size: 24px;">Set up automatic payments for ${contract.title}</h1>
        </div>

        <!-- Main Content -->
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">

          <!-- Greeting -->
          <p style="font-size: 16px; margin-top: 0;">Hi ${contract.clients.name},</p>
          <p style="font-size: 16px;">${businessName} has set up a recurring billing contract for you. Please review the details below and set up your automatic payment when ready.</p>

          <!-- Contract Summary Box -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <h3 style="margin: 0 0 16px 0; color: #0a2540; font-size: 18px;">${contract.title}</h3>

            ${
              contract.description
                ? `
            <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">${contract.description}</p>
            `
                : ""
            }

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount per billing period:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0a2540; font-size: 18px;">${formatCurrency(
                  contract.amount
                )}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Billing frequency:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500;">${intervalDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Contract duration:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500;">${durationDisplay}</td>
              </tr>
            </table>
          </div>

          <!-- CTA -->
          <div style="text-align: center; margin: 32px 0;">
            <p style="color: #6b7280; margin-bottom: 20px;">Click the button below to set up your automatic payment method:</p>
            <a href="${setupUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">
              Set Up Automatic Payments
            </a>
            <p style="color: #9ca3af; margin-top: 16px; font-size: 13px;">You can manage or cancel your subscription anytime</p>
          </div>

          <!-- Security Note -->
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #166534; font-size: 13px;">
              <strong>🔒 Safe & Secure:</strong> Your payment information is processed securely through Stripe, a trusted payment processor. Your card details are never stored on our servers.
            </p>
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

    // Send the email
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Barix Billing <onboarding@resend.dev>",
      to: contract.clients.email,
      subject: `Set up automatic payments — ${contract.title} from ${businessName}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return apiError("Failed to send email: " + emailError.message, 500);
    }

    // Update setup_link_sent_at timestamp
    const { error: updateError } = await supabaseAdmin
      .from("recurring_contracts")
      .update({
        setup_link_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractId);

    if (updateError) {
      console.error("Error updating setup_link_sent_at:", updateError);
      // Don't fail the request - email was sent successfully
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      emailId: emailData?.id,
      clientEmail: contract.clients.email,
    });
  } catch (error) {
    console.error("Send setup email error:", error);
    return apiError("Internal server error", 500);
  }
}
