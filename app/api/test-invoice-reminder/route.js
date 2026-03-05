import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    const ownerId = process.env.TEST_OWNER_ID || null;

    let query = supabaseAdmin
      .from("invoices")
      .select("id, created_at, owner_id, invoice_number")
      .order("created_at", { ascending: false })
      .limit(1);

    if (ownerId) query = query.eq("owner_id", ownerId);

    const { data: invoices, error } = await query;
    if (error) throw error;

    const invoice = invoices?.[0];
    if (!invoice) {
      return NextResponse.json(
        { error: "No invoices found to test." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    //Always use the current request origin (no env mismatch)
    const origin = new URL(req.url).origin;

    const res = await fetch(`${origin}/api/send-invoice-reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        invoiceId: invoice.id,
        reminderType: "before_due",
      }),
    });

    //Read as text first, then try to parse JSON
    const raw = await res.text();
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = { nonJsonBody: raw?.slice(0, 500) || "" };
    }

    return NextResponse.json(
      {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get("content-type"),
        testedInvoice: invoice,
        sendResult: parsed,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e.message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
