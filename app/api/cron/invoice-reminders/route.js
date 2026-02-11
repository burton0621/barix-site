import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---- Defaults (v1) ----
// You can later make these per-user via your settings table.
const DAYS_BEFORE_DUE = Number(process.env.REMINDER_DAYS_BEFORE_DUE || 3);
const DAYS_AFTER_DUE = Number(process.env.REMINDER_DAYS_AFTER_DUE || 1);

function isoDateOnly(d) {
  // returns YYYY-MM-DD in local server time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function GET(req) {
  try {
    // --- 1) Auth guard ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- 2) Decide "today" window (date-only) ---
    //compare against invoice.due_date (date column) as YYYY-MM-DD
    const today = new Date();
    const todayStr = isoDateOnly(today);

    const beforeDueTarget = isoDateOnly(addDays(today, DAYS_BEFORE_DUE)); // invoices due in N days
    const afterDueTarget = isoDateOnly(addDays(today, -DAYS_AFTER_DUE));  // invoices due N days ago

    // --- 3) Find candidates (unpaid invoices only) ---
    // NOTE: adjust status filters to match your system (draft/sent/etc.)
    const { data: invoices, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("id, due_date, owner_id, paid_at, status, document_type")
      .is("paid_at", null)
      .neq("document_type", "estimate")
      .in("status", ["sent"]) // <-- change if you want to include others
      .or(`due_date.eq.${beforeDueTarget},due_date.eq.${afterDueTarget}`);

    if (invErr) throw invErr;

    const origin = new URL(req.url).origin;

    let attempted = 0;
    let sent = 0;
    const results = [];

    for (const inv of invoices || []) {
      let reminderType = null;

      if (inv.due_date === beforeDueTarget) reminderType = "before_due";
      if (inv.due_date === afterDueTarget) reminderType = "after_due";

      if (!reminderType) continue;

      attempted += 1;

      // --- 4) Dedup check via log table ---
      const { data: alreadySent, error: logCheckErr } = await supabaseAdmin
        .from("invoice_reminder_logs")
        .select("id")
        .eq("invoice_id", inv.id)
        .eq("reminder_type", reminderType)
        .limit(1);

      if (logCheckErr) {
        results.push({ invoiceId: inv.id, reminderType, ok: false, error: logCheckErr.message });
        continue;
      }

      if (alreadySent && alreadySent.length > 0) {
        results.push({ invoiceId: inv.id, reminderType, ok: true, skipped: "already_logged" });
        continue;
      }

      // --- 5) Send reminder (call your existing route) ---
      const res = await fetch(`${origin}/api/send-invoice-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ invoiceId: inv.id, reminderType }),
      });

      const raw = await res.text();
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = { nonJsonBody: raw?.slice(0, 500) || "" };
      }

      if (!res.ok) {
        results.push({
          invoiceId: inv.id,
          reminderType,
          ok: false,
          status: res.status,
          payload,
        });
        continue;
      }

      // --- 6) Write log (prevents future duplicates) ---
      const { error: logInsertErr } = await supabaseAdmin
        .from("invoice_reminder_logs")
        .insert([{ invoice_id: inv.id, reminder_type: reminderType }]);

      if (logInsertErr) {
        // If the unique index blocks duplicates, that's fine.
        // But if it's another error, record it.
        results.push({
          invoiceId: inv.id,
          reminderType,
          ok: true,
          sent: true,
          warning: `Sent but failed to log: ${logInsertErr.message}`,
        });
        sent += 1;
        continue;
      }

      sent += 1;
      results.push({ invoiceId: inv.id, reminderType, ok: true, sent: true });
    }

    return NextResponse.json({
      ok: true,
      today: todayStr,
      beforeDueTarget,
      afterDueTarget,
      attempted,
      sent,
      results,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
