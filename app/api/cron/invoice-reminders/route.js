import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fallbacks if a contractor has no settings row yet (should be rare for you)
const FALLBACK_BEFORE = 3;
const FALLBACK_AFTER = 1;

function isoDateOnly(d) {
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
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- 2) Today (date-only) ---
    const today = new Date();
    const todayStr = isoDateOnly(today);

    // --- 3) Load contractor settings (per-user reminder config) ---
    const { data: settingsRows, error: settingsErr } = await supabaseAdmin
      .from("contractor_settings")
      .select(
        "contractor_id, enable_invoice_reminders, reminder_days_before_due, reminder_days_after_due"
      );

    if (settingsErr) throw settingsErr;

    // Map settings by contractor_id (which should match invoices.owner_id)
    const settingsByContractor = new Map();

    let maxBefore = FALLBACK_BEFORE;
    let maxAfter = FALLBACK_AFTER;

    for (const row of settingsRows || []) {
      const enabled = row.enable_invoice_reminders === true;
      const beforeDays = Number(
        row.reminder_days_before_due ?? FALLBACK_BEFORE
      );
      const afterDays = Number(row.reminder_days_after_due ?? FALLBACK_AFTER);

      settingsByContractor.set(row.contractor_id, {
        enabled,
        beforeDays: Number.isFinite(beforeDays) ? beforeDays : FALLBACK_BEFORE,
        afterDays: Number.isFinite(afterDays) ? afterDays : FALLBACK_AFTER,
      });

      if (Number.isFinite(beforeDays)) maxBefore = Math.max(maxBefore, beforeDays);
      if (Number.isFinite(afterDays)) maxAfter = Math.max(maxAfter, afterDays);
    }

    // --- 4) Query candidate invoices in a due_date window based on max settings ---
    // We only need invoices whose due_date falls within [today - maxAfter, today + maxBefore]
    const minDue = isoDateOnly(addDays(today, -maxAfter));
    const maxDue = isoDateOnly(addDays(today, maxBefore));

    const { data: invoices, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("id, due_date, owner_id, paid_at, status, document_type")
      .is("paid_at", null)
      .neq("document_type", "estimate")
      .in("status", ["sent"]) // adjust if you want to include others
      .gte("due_date", minDue)
      .lte("due_date", maxDue);

    if (invErr) throw invErr;

    const origin = new URL(req.url).origin;

    let attempted = 0;
    let sent = 0;
    const results = [];

    for (const inv of invoices || []) {
      const s =
        settingsByContractor.get(inv.owner_id) || {
          enabled: false, // safest default: if no settings row, do nothing
          beforeDays: FALLBACK_BEFORE,
          afterDays: FALLBACK_AFTER,
        };

      if (!s.enabled) {
        results.push({
          invoiceId: inv.id,
          ownerId: inv.owner_id,
          ok: true,
          skipped: "reminders_disabled_or_missing_settings",
        });
        continue;
      }

      // Determine whether THIS invoice needs a reminder TODAY based on THIS owner's settings
      const beforeTarget = isoDateOnly(addDays(today, s.beforeDays));
      const afterTarget = isoDateOnly(addDays(today, -s.afterDays));

      let reminderType = null;
      if (inv.due_date === beforeTarget) reminderType = "before_due";
      if (inv.due_date === afterTarget) reminderType = "after_due";

      if (!reminderType) {
        results.push({
          invoiceId: inv.id,
          ownerId: inv.owner_id,
          ok: true,
          skipped: "not_due_for_reminder_today",
          due_date: inv.due_date,
          beforeTarget,
          afterTarget,
          settingsUsed: s,
        });
        continue;
      }

      attempted += 1;

      // --- Dedup check via log table ---
      const { data: alreadySent, error: logCheckErr } = await supabaseAdmin
        .from("invoice_reminder_logs")
        .select("id")
        .eq("invoice_id", inv.id)
        .eq("reminder_type", reminderType)
        .limit(1);

      if (logCheckErr) {
        results.push({
          invoiceId: inv.id,
          ownerId: inv.owner_id,
          reminderType,
          ok: false,
          error: logCheckErr.message,
        });
        continue;
      }

      if (alreadySent && alreadySent.length > 0) {
        results.push({
          invoiceId: inv.id,
          ownerId: inv.owner_id,
          reminderType,
          ok: true,
          skipped: "already_logged",
        });
        continue;
      }

      // --- Send reminder (call your existing route) ---
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
          ownerId: inv.owner_id,
          reminderType,
          ok: false,
          status: res.status,
          payload,
        });
        continue;
      }

      // --- Write log (prevents future duplicates) ---
      const { error: logInsertErr } = await supabaseAdmin
        .from("invoice_reminder_logs")
        .insert([{ invoice_id: inv.id, reminder_type: reminderType }]);

      if (logInsertErr) {
        results.push({
          invoiceId: inv.id,
          ownerId: inv.owner_id,
          reminderType,
          ok: true,
          sent: true,
          warning: `Sent but failed to log: ${logInsertErr.message}`,
        });
        sent += 1;
        continue;
      }

      sent += 1;
      results.push({
        invoiceId: inv.id,
        ownerId: inv.owner_id,
        reminderType,
        ok: true,
        sent: true,
      });
    }

    return NextResponse.json({
      ok: true,
      today: todayStr,
      due_window: { minDue, maxDue },
      maxSettings: { maxBefore, maxAfter },
      attempted,
      sent,
      results,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
