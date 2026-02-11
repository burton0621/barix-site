import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// --- Hard env guards (prevents silent RLS / auth weirdness) ---
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const supabaseAdmin = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
);

// Fallbacks if a contractor has no settings row yet (safest is disabled)
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

function parseDateOnly(dateStr) {
  // Postgres DATE comes as "YYYY-MM-DD"
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function diffDays(a, b) {
  // a - b in days, using local midnight
  const msPerDay = 24 * 60 * 60 * 1000;
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((a0 - b0) / msPerDay);
}

// Reserve a reminder row BEFORE sending so duplicates can't happen.
// Requires DB uniqueness to be truly bulletproof.
// - before_due: unique (invoice_id, reminder_type) where reminder_type='before_due'
// - after_due:  unique (invoice_id, reminder_type, overdue_step) where reminder_type='after_due'
async function reserveReminder({ invoiceId, reminderType, sentOn, overdueStep }) {
  const row = {
    invoice_id: invoiceId,
    reminder_type: reminderType,
    sent_on: sentOn,
    overdue_step: overdueStep, // always NOT NULL now
  };

  const { data, error } = await supabaseAdmin
    .from("invoice_reminder_logs")
    .upsert([row], {
      onConflict: "invoice_id,reminder_type,overdue_step",
      ignoreDuplicates: true,
    })
    .select("invoice_id");

  if (error) throw error;

  const reserved = Array.isArray(data) ? data.length > 0 : !!data;
  return { reserved };
}


async function unreserveReminder({ invoiceId, reminderType, overdueStep }) {
  const { error } = await supabaseAdmin
    .from("invoice_reminder_logs")
    .delete()
    .eq("invoice_id", invoiceId)
    .eq("reminder_type", reminderType)
    .eq("overdue_step", overdueStep);

  if (error) throw error;
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
    if (token !== requireEnv("CRON_SECRET")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- 2) Today (date-only) ---
    const today = new Date();
    const todayStr = isoDateOnly(today);

    // --- 3) Load contractor settings ---
    const { data: settingsRows, error: settingsErr } = await supabaseAdmin
      .from("contractor_settings")
      .select(
        "contractor_id, enable_invoice_reminders, reminder_days_before_due, reminder_days_after_due"
      );

    if (settingsErr) throw settingsErr;

    const settingsByContractor = new Map();
    let maxBefore = FALLBACK_BEFORE;
    let maxAfter = FALLBACK_AFTER;

    for (const row of settingsRows || []) {
      const enabled = row.enable_invoice_reminders === true;
      const beforeDays = Number(row.reminder_days_before_due ?? FALLBACK_BEFORE);
      const afterDays = Number(row.reminder_days_after_due ?? FALLBACK_AFTER);

      settingsByContractor.set(row.contractor_id, {
        enabled,
        beforeDays: Number.isFinite(beforeDays) ? beforeDays : FALLBACK_BEFORE,
        afterDays: Number.isFinite(afterDays) ? afterDays : FALLBACK_AFTER,
      });

      if (Number.isFinite(beforeDays)) maxBefore = Math.max(maxBefore, beforeDays);
      if (Number.isFinite(afterDays)) maxAfter = Math.max(maxAfter, afterDays);
    }

    // --- 4) Candidate invoices in window ---
    const minDue = isoDateOnly(addDays(today, -maxAfter));
    const maxDue = isoDateOnly(addDays(today, maxBefore));

    const { data: invoices, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("id, due_date, owner_id, paid_at, status, document_type")
      .is("paid_at", null)
      .neq("document_type", "estimate")
      .in("status", ["sent"]) // adjust if needed
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
          enabled: false, // safest default
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

      const due = parseDateOnly(inv.due_date);
      const daysUntilDue = diffDays(due, today); // due - today
      const daysPastDue = diffDays(today, due);  // today - due

      let reminderType = null;
      let overdueStep = null;

      if (daysUntilDue >= 1 && daysUntilDue <= s.beforeDays) {
        reminderType = "before_due";
        overdueStep = 0; // IMPORTANT
      }

      if (!reminderType && s.afterDays > 0 && daysPastDue >= s.afterDays) {
        if (daysPastDue % s.afterDays === 0) {
          reminderType = "after_due";
          overdueStep = daysPastDue; // 7, 14, 21, ...
        } else {
          // skip
          continue;
        }
      }


      if (!reminderType) {
        results.push({
          invoiceId: inv.id,
          ownerId: inv.owner_id,
          ok: true,
          skipped: "not_due_for_reminder_today",
          due_date: inv.due_date,
          daysUntilDue,
          daysPastDue,
          settingsUsed: s,
        });
        continue;
      }

      // --- 5) Reserve (dedupe) BEFORE sending ---
      const reservation = await reserveReminder({
        invoiceId: inv.id,
        reminderType,
        sentOn: todayStr,
        overdueStep,
      });

      if (!reservation.reserved) {
        results.push({
          invoiceId: inv.id,
          ownerId: inv.owner_id,
          reminderType,
          ok: true,
          skipped:
            reminderType === "before_due"
              ? "before_due_already_sent"
              : "after_due_step_already_sent",
          overdueStep,
        });
        continue;
      }

      attempted += 1;

      // --- 6) Send reminder ---
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
        // Undo reservation so next cron run can retry
        await unreserveReminder({
          invoiceId: inv.id,
          reminderType,
          overdueStep,
        });

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

      sent += 1;

      results.push({
        invoiceId: inv.id,
        ownerId: inv.owner_id,
        reminderType,
        overdueStep,
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
