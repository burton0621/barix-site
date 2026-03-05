"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";

import shared from "../settings.module.css";
import styles from "./invoice.module.css";

export default function InvoiceSettingsPage() {
  const router = useRouter();
  const { session, membership, isLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [contractorId, setContractorId] = useState(null);

  const [settingsLoading, setSettingsLoading] = useState(true);

  // -----------------------
  // Invoice defaults
  // -----------------------
  const [defaultDueDays, setDefaultDueDays] = useState(30);

  // -----------------------
  // Indirect materials
  // -----------------------
  const [enableIndirectMaterials, setEnableIndirectMaterials] = useState(false);
  const [indirectAmount, setIndirectAmount] = useState("0");
  const [indirectPercent, setIndirectPercent] = useState("0");
  const [indirectDefaultType, setIndirectDefaultType] = useState("amount"); // "amount" | "percent"

  // -----------------------
  // Reminders
  // -----------------------
  const [enableInvoiceReminders, setEnableInvoiceReminders] = useState(false);
  const [reminderDaysBeforeDue, setReminderDaysBeforeDue] = useState("7");
  const [reminderDaysAfterDue, setReminderDaysAfterDue] = useState("3");

  // -----------------------
  // UI state
  // -----------------------
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  // -----------------------
  // Persist helpers (auto-save toggles)
  // -----------------------
  async function persistIndirectEnabled(nextValue) {
    if (!contractorId) return;

    setSaving(true);
    setErrorText("");
    setSuccessText("");

    const { error } = await supabase
      .from("contractor_settings")
      .upsert(
        {
          contractor_id: contractorId,
          enable_indirect_materials: nextValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "contractor_id" }
      );

    if (error) {
      setErrorText(error.message);
      setEnableIndirectMaterials((prev) => !prev);
      setSaving(false);
      return;
    }

    setSuccessText("Invoice settings saved.");
    setSaving(false);
  }

  async function persistRemindersEnabled(nextValue) {
    if (!contractorId) return;

    setSaving(true);
    setErrorText("");
    setSuccessText("");

    const { error } = await supabase
      .from("contractor_settings")
      .upsert(
        {
          contractor_id: contractorId,
          enable_invoice_reminders: nextValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "contractor_id" }
      );

    if (error) {
      setErrorText(error.message);
      setEnableInvoiceReminders((prev) => !prev);
      setSaving(false);
      return;
    }

    setSuccessText("Invoice settings saved.");
    setSaving(false);
  }

  // -----------------------
  // Auth / contractor resolution
  // -----------------------
  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.push("/login");
      return;
    }

    const cId = membership?.contractor_id || session.user.id;
    setContractorId(cId);
    setLoading(false);
  }, [isLoading, session, membership, router]);

  // -----------------------
  // Load settings
  // -----------------------
  useEffect(() => {
    if (!contractorId) return;

    let cancelled = false;

    async function load() {
      setSettingsLoading(true);
      setErrorText("");
      setSuccessText("");

      const { data, error } = await supabase
        .from("contractor_settings")
        .select(
          `
          default_invoice_due_days,
          enable_indirect_materials,
          indirect_materials_amount,
          indirect_materials_percent,
          indirect_materials_default_type,
          enable_invoice_reminders,
          reminder_days_before_due,
          reminder_days_after_due
        `
        )
        .eq("contractor_id", contractorId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setErrorText(error.message);
        setSettingsLoading(false);
        return;
      }

      // If no row exists yet, create one
      if (!data) {
        const defaults = {
          contractor_id: contractorId,
          default_invoice_due_days: 30,

          enable_indirect_materials: false,
          indirect_materials_amount: 0,
          indirect_materials_percent: 0,
          indirect_materials_default_type: "amount",

          enable_invoice_reminders: false,
          reminder_days_before_due: 3,
          reminder_days_after_due: 3,

          updated_at: new Date().toISOString(),
        };

        const { error: insertErr } = await supabase
          .from("contractor_settings")
          .insert(defaults);

        if (cancelled) return;

        if (insertErr) {
          setErrorText(insertErr.message);
          setSettingsLoading(false);
          return;
        }

        setDefaultDueDays(defaults.default_invoice_due_days);
        setEnableIndirectMaterials(defaults.enable_indirect_materials);
        setIndirectAmount(String(defaults.indirect_materials_amount));
        setIndirectPercent(String(defaults.indirect_materials_percent));
        setIndirectDefaultType(defaults.indirect_materials_default_type);

        setEnableInvoiceReminders(defaults.enable_invoice_reminders);
        setReminderDaysBeforeDue(String(defaults.reminder_days_before_due));
        setReminderDaysAfterDue(String(defaults.reminder_days_after_due));

        setSettingsLoading(false);
        return;
      }

      // Row exists: hydrate state
      setDefaultDueDays(data.default_invoice_due_days ?? 30);
      setEnableIndirectMaterials(!!data.enable_indirect_materials);
      setIndirectAmount(String(data.indirect_materials_amount ?? 0));
      setIndirectPercent(String(data.indirect_materials_percent ?? 0));
      setIndirectDefaultType(data.indirect_materials_default_type ?? "amount");

      setEnableInvoiceReminders(!!data.enable_invoice_reminders);
      setReminderDaysBeforeDue(String(data.reminder_days_before_due ?? 3));
      setReminderDaysAfterDue(String(data.reminder_days_after_due ?? 3));

      setSettingsLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [contractorId]);

  // -----------------------
  // Save handler
  // -----------------------
  async function handleSave(e) {
    e.preventDefault();
    if (!contractorId) return;

    setSaving(true);
    setErrorText("");
    setSuccessText("");

    const due = Number(defaultDueDays);
    if (!Number.isFinite(due) || due < 0 || due > 365) {
      setErrorText("Default due date must be between 0 and 365 days.");
      setSaving(false);
      return;
    }

    const amountVal = Number(indirectAmount);
    const percentVal = Number(indirectPercent);

    if (enableIndirectMaterials) {
      if (!Number.isFinite(amountVal) || amountVal < 0) {
        setErrorText("Indirect amount must be 0 or greater.");
        setSaving(false);
        return;
      }

      if (!Number.isFinite(percentVal) || percentVal < 0 || percentVal > 100) {
        setErrorText("Indirect percent must be between 0 and 100.");
        setSaving(false);
        return;
      }
    }

    const beforeVal = Number(reminderDaysBeforeDue);
    const afterVal = Number(reminderDaysAfterDue);

    // Validate even if disabled, to prevent saving junk values
    if (!Number.isFinite(beforeVal) || beforeVal < 0 || beforeVal > 365) {
      setErrorText("Reminder days before due must be between 0 and 365.");
      setSaving(false);
      return;
    }

    if (!Number.isFinite(afterVal) || afterVal < 0 || afterVal > 365) {
      setErrorText("Reminder days after due must be between 0 and 365.");
      setSaving(false);
      return;
    }

    const payload = {
      contractor_id: contractorId,
      default_invoice_due_days: due,

      enable_indirect_materials: enableIndirectMaterials,
      indirect_materials_amount: amountVal,
      indirect_materials_percent: percentVal,
      indirect_materials_default_type: indirectDefaultType,

      enable_invoice_reminders: !!enableInvoiceReminders,
      reminder_days_before_due: beforeVal,
      reminder_days_after_due: afterVal,

      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("contractor_settings")
      .upsert(payload, { onConflict: "contractor_id" });

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    setSuccessText("Invoice settings saved.");
    setSaving(false);
  }

  // -----------------------
  // Loading state
  // -----------------------
  if (loading || isLoading || settingsLoading) {
    return (
      <div className={shared.loadingWrapper}>
        <p className={shared.loadingText}>Loading...</p>
      </div>
    );
  }

  // -----------------------
  // Render
  // -----------------------
  return (
    <div className={styles.page}>
      <form onSubmit={handleSave}>
        {/* Card 1: Default Due Date */}
        <section className={shared.card}>
          <h2 className={shared.cardTitle}>Default Invoice Due Date</h2>
          <p className={shared.cardSubtitle}>
            This controls the default due date when creating a new invoice.
          </p>

          <div className={styles.cardBody}>
            <div className={styles.settingRow}>
              <div className={styles.settingText}>
                <p className={styles.settingTitle}>Due date offset (days)</p>
                <p className={styles.settingDesc}>
                  Example: 30 means invoices default to due 30 days after the
                  issue date.
                </p>
              </div>

              <div className={styles.rightControl}>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={defaultDueDays}
                  onChange={(e) => setDefaultDueDays(e.target.value)}
                  className={`${shared.input} ${styles.compactNumberInput}`}
                />
                <p className={styles.helperText}>Allowed range: 0–365</p>
              </div>
            </div>
          </div>
        </section>

        {/* Card 2: Indirect Materials */}
        <section className={shared.card}>
          <h2 className={shared.cardTitle}>Indirect Materials</h2>
          <p className={shared.cardSubtitle}>
            Automatically include indirect material costs on invoices.
          </p>

          <div className={styles.cardBody}>
            {/* Enable toggle */}
            <div className={styles.settingRow}>
              <div className={styles.settingText}>
                <p className={styles.settingTitle}>Enable indirect materials</p>
                <p className={styles.settingDesc}>
                  When enabled, indirect materials can be applied to invoices.
                </p>
              </div>

              <div
                className={`${styles.statusToggle} ${
                  enableIndirectMaterials
                    ? styles.statusEnabled
                    : styles.statusDisabled
                }`}
                onClick={() => {
                  if (saving || settingsLoading) return;
                  const next = !enableIndirectMaterials;
                  setEnableIndirectMaterials(next);
                  persistIndirectEnabled(next);
                }}
              >
                {enableIndirectMaterials ? "Enabled" : "Disabled"}
              </div>
            </div>

            {enableIndirectMaterials && (
              <>
                {/* Amount */}
                <div className={styles.settingRow}>
                  <div className={styles.settingText}>
                    <p className={styles.settingTitle}>Flat amount ($)</p>
                    <p className={styles.settingDesc}>
                      A fixed dollar amount added to the invoice.
                    </p>
                  </div>

                  <div className={styles.rightControl}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={indirectAmount}
                      onChange={(e) => setIndirectAmount(e.target.value)}
                      className={`${shared.input} ${styles.compactNumberInput}`}
                    />
                  </div>
                </div>

                {/* Percent */}
                <div className={styles.settingRow}>
                  <div className={styles.settingText}>
                    <p className={styles.settingTitle}>Percent (%)</p>
                    <p className={styles.settingDesc}>
                      A percentage of the invoice subtotal.
                    </p>
                  </div>

                  <div className={styles.rightControl}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={indirectPercent}
                      onChange={(e) => setIndirectPercent(e.target.value)}
                      className={`${shared.input} ${styles.compactPercentInput}`}
                    />
                  </div>
                </div>

                {/* Default selector */}
                <div className={styles.settingRow}>
                  <div className={styles.settingText}>
                    <p className={styles.settingTitle}>Default type</p>
                    <p className={styles.settingDesc}>
                      Choose which indirect material option is selected by
                      default.
                    </p>
                  </div>

                  <div className={styles.rightControl}>
                    <select
                      value={indirectDefaultType}
                      onChange={(e) => setIndirectDefaultType(e.target.value)}
                      className={`${shared.input} ${styles.roundedSelect}`}
                    >
                      <option value="amount">Use amount by default</option>
                      <option value="percent">Use percent by default</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Card 3: Reminders */}
        <section className={shared.card}>
          <h2 className={shared.cardTitle}>Reminders</h2>
          <p className={shared.cardSubtitle}>
            Setup automatic reminders for your clients for x days before due.
          </p>

          <div className={styles.cardBody}>
            {/* Enable toggle */}
            <div className={styles.settingRow}>
              <div className={styles.settingText}>
                <p className={styles.settingTitle}>Enable reminders</p>
                <p className={styles.settingDesc}>
                  When enabled, clients can receive automated invoice reminder
                  emails based on your timing settings.
                </p>
              </div>

              <div
                className={`${styles.statusToggle} ${
                  enableInvoiceReminders
                    ? styles.statusEnabled
                    : styles.statusDisabled
                }`}
                onClick={() => {
                  if (saving || settingsLoading) return;
                  const next = !enableInvoiceReminders;
                  setEnableInvoiceReminders(next);
                  persistRemindersEnabled(next);
                }}
              >
                {enableInvoiceReminders ? "Enabled" : "Disabled"}
              </div>
            </div>

            {enableInvoiceReminders && (
              <>
                {/* Days before due */}
                <div className={styles.settingRow}>
                  <div className={styles.settingText}>
                    <p className={styles.settingTitle}>
                      Days before due date to send a reminder
                    </p>
                    <p className={styles.settingDesc}>
                      Example: 3 sends a reminder 3 days before the invoice due
                      date.
                    </p>
                  </div>

                  <div className={styles.rightControl}>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={reminderDaysBeforeDue}
                      onChange={(e) => setReminderDaysBeforeDue(e.target.value)}
                      className={`${shared.input} ${styles.compactNumberInput}`}
                    />
                    <p className={styles.helperText}>Allowed range: 0–365</p>
                  </div>
                </div>

                {/* Days after due */}
                <div className={styles.settingRow}>
                  <div className={styles.settingText}>
                    <p className={styles.settingTitle}>
                      Days after due date to send a reminder
                    </p>
                    <p className={styles.settingDesc}>
                      Example: 3 sends a reminder 3 days after the invoice is
                      overdue.
                    </p>
                  </div>

                  <div className={styles.rightControl}>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={reminderDaysAfterDue}
                      onChange={(e) => setReminderDaysAfterDue(e.target.value)}
                      className={`${shared.input} ${styles.compactNumberInput}`}
                    />
                    <p className={styles.helperText}>Allowed range: 0–365</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Save bar */}
        {errorText && <p className={shared.errorText}>{errorText}</p>}
        {successText && <p className={shared.successText}>{successText}</p>}

        <button type="submit" className={shared.primaryButton} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
