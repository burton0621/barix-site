// app/api/cron/invoice-reminders/route.js
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

/**
 * Reserve a reminder row BEFORE sending so duplicates can't happen.
 * This uses the existing UNIQUE index:
 *   (invoice_id, reminder_type, overdue_step)
 *
 * - before_due always uses overdue_step = 0
 * - after_due uses overdue_step = daysPastDue (e.g., 7, 14, 21...)
 */
async function reserveReminder({
  invoiceId,
  reminderType, // "before_due" | "after_due"
  sentOn, // YYYY-MM-DD
  overdueStep, // 0 for before_due, daysPastDue for after_due
  settingsBeforeDays,
  settingsAfterDays,
}) {
  const row = {
    invoice_id: invoiceId,
    reminder_type: reminderType,
    sent_on: sentOn,
    overdue_step: overdueStep, // NOT NULL
    status: "reserved",
    settings_before_days: settingsBeforeDays ?? null,
    settings_after_days: settingsAfterDays ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("invoice_reminder_logs")
    .upsert([row], {
      onConflict: "invoice_id,reminder_type,overdue_step",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw error;

  const reserved = Array.isArray(data) ? data.length > 0 : !!data;
  return { reserved, id: reserved ? data[0].id : null };
}

async function markReminderSent({ id }) {
  const { error } = await supabaseAdmin
    .from("invoice_reminder_logs")
    .update({
      status: "sent",
      // If your DB column sent_at is NOT NULL with default now(),
      // this will overwrite it with the actual send time.
      sent_at: new Date().toISOString(),
      error: null,
    })
    .eq("id", id);

  if (error) throw error;
}

async function markReminderFailed({ id, errorMessage }) {
  const { error } = await supabaseAdmin
    .from("invoice_reminder_logs")
    .update({
      status: "failed",
      error: errorMessage || "unknown_error",
    })
    .eq("id", id);

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

    // --- 3) Load contractor settings (NO DEFAULTS) ---
    const { data: settingsRows, error: settingsErr } = await supabaseAdmin
      .from("contractor_settings")
      .select(
        "contractor_id, enable_invoice_reminders, reminder_days_before_due, reminder_days_after_due"
      );

    if (settingsErr) throw settingsErr;

    const settingsByContractor = new Map();
    const enabledContractorIds = [];
    let maxBefore = 0;

    for (const row of settingsRows || []) {
      const enabled = row.enable_invoice_reminders === true;
      if (!enabled) continue;

      const beforeDays = Number(row.reminder_days_before_due);
      const afterDays = Number(row.reminder_days_after_due);

      // No defaults: missing/invalid settings => skip
      if (!Number.isFinite(beforeDays) || beforeDays < 0) continue;
      if (!Number.isFinite(afterDays) || afterDays < 0) continue;

      settingsByContractor.set(row.contractor_id, {
        enabled: true,
        beforeDays,
        afterDays,
      });

      enabledContractorIds.push(row.contractor_id);
      maxBefore = Math.max(maxBefore, beforeDays);
    }

    // If nobody is enabled, nothing to do
    if (enabledContractorIds.length === 0) {
      return NextResponse.json({
        ok: true,
        today: todayStr,
        due_window: { overdue_lte: todayStr, upcoming_lte: null },
        maxSettings: { maxBefore, maxAfter: null },
        attempted: 0,
        sent: 0,
        results: [],
      });
    }

    // --- 4) Candidate invoices ---
    // A) Overdue candidates: NO lookback limit (respect user settings in logic)
    const { data: overdueInvoices, error: overdueErr } = await supabaseAdmin
      .from("invoices")
      .select("id, due_date, owner_id, paid_at, status, document_type")
      .is("paid_at", null)
      .neq("document_type", "estimate")
      .in("status", ["sent"]) // adjust if needed
      .in("owner_id", enabledContractorIds)
      .lte("due_date", todayStr);

    if (overdueErr) throw overdueErr;

    // B) Upcoming candidates for before_due
    // We only scan forward as far as the maxBefore among ENABLED contractors.
    const maxDue = isoDateOnly(addDays(today, maxBefore));
    let upcomingInvoices = [];
    if (maxBefore > 0) {
      const { data, error } = await supabaseAdmin
        .from("invoices")
        .select("id, due_date, owner_id, paid_at, status, document_type")
        .is("paid_at", null)
        .neq("document_type", "estimate")
        .in("status", ["sent"]) // adjust if needed
        .in("owner_id", enabledContractorIds)
        .gte("due_date", todayStr)
        .lte("due_date", maxDue);

      if (error) throw error;
      upcomingInvoices = data || [];
    }

    // Merge (de-dupe by id)
    const byId = new Map();
    for (const inv of overdueInvoices || []) byId.set(inv.id, inv);
    for (const inv of upcomingInvoices || []) byId.set(inv.id, inv);
    const invoices = Array.from(byId.values());

    const origin = new URL(req.url).origin;

    let attempted = 0;
    let sent = 0;
    const results = [];

    for (const inv of invoices || []) {
      const s = settingsByContractor.get(inv.owner_id);

      // No defaults: if settings missing for owner, skip
      if (!s?.enabled) {
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

      //BEFORE DUE: send exactly once, exactly N days before due
      if (s.beforeDays > 0 && daysUntilDue === s.beforeDays) {
        reminderType = "before_due";
        overdueStep = 0;
      }

      //AFTER DUE: send exactly once per interval (N, 2N, 3N...)
      if (!reminderType && s.afterDays > 0 && daysPastDue >= s.afterDays) {
        if (daysPastDue % s.afterDays === 0) {
          reminderType = "after_due";
          overdueStep = daysPastDue; // 7, 14, 21, ...
        } else {
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
        settingsBeforeDays: s.beforeDays,
        settingsAfterDays: s.afterDays,
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
        body: JSON.stringify({
          invoiceId: inv.id,
          reminderType,
          // Optional if you later want it in email:
          // overdueStep,
        }),
      });

      const raw = await res.text();
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = { nonJsonBody: raw?.slice(0, 500) || "" };
      }

      if (!res.ok) {
        await markReminderFailed({
          id: reservation.id,
          errorMessage:
            payload?.error ||
            payload?.message ||
            `send-invoice-reminder_failed_HTTP_${res.status}`,
        });

        results.push({
          invoiceId: inv.id,
          ownerId: inv.owner_id,
          reminderType,
          overdueStep,
          ok: false,
          status: res.status,
          payload,
        });
        continue;
      }

      await markReminderSent({ id: reservation.id });
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
      due_window: {
        overdue_lte: todayStr,
        upcoming_lte: maxBefore > 0 ? maxDue : null,
      },
      maxSettings: { maxBefore, maxAfter: null },
      attempted,
      sent,
      results,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}