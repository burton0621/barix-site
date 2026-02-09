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

  // Form state
  const [defaultDueDays, setDefaultDueDays] = useState(30);
  const [indirectType, setIndirectType] = useState("amount"); // "amount" | "percent"
  const [indirectValue, setIndirectValue] = useState("0");
  const [enablePercentInvoices, setEnablePercentInvoices] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.push("/login");
      } else {
        const cId = membership?.contractor_id || session.user.id;
        setContractorId(cId);
        setLoading(false);
      }
    }
  }, [isLoading, session, membership, router]);

  // Load current settings (if exists)
  useEffect(() => {
    if (!contractorId) return;

    let cancelled = false;

    async function load() {
      setErrorText("");
      setSuccessText("");

      const { data, error } = await supabase
        .from("contractor_settings")
        .select("default_invoice_due_days, indirect_materials_type, indirect_materials_value, enable_percent_invoices")
        .eq("contractor_id", contractorId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        // If you haven't created this table yet, you'll see the error here.
        setErrorText(error.message);
        return;
      }

      setDefaultDueDays(data?.default_invoice_due_days ?? 30);
      setIndirectType(data?.indirect_materials_type ?? "amount");
      setIndirectValue(String(data?.indirect_materials_value ?? 0));
      setEnablePercentInvoices(!!data?.enable_percent_invoices);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [contractorId]);

  async function handleSave(e) {
    e.preventDefault();
    if (!contractorId) return;

    setSaving(true);
    setErrorText("");
    setSuccessText("");

    const due = Number(defaultDueDays);
    if (!Number.isFinite(due) || due < 0 || due > 365) {
      setErrorText("Default due date must be a number of days between 0 and 365.");
      setSaving(false);
      return;
    }

    const val = Number(indirectValue);
    if (!Number.isFinite(val) || val < 0) {
      setErrorText("Indirect materials must be a valid number (0 or greater).");
      setSaving(false);
      return;
    }

    if (indirectType === "percent" && val > 100) {
      setErrorText("Indirect materials % cannot be greater than 100.");
      setSaving(false);
      return;
    }

    const payload = {
      contractor_id: contractorId,
      default_invoice_due_days: due,
      indirect_materials_type: indirectType,
      indirect_materials_value: val,
      enable_percent_invoices: !!enablePercentInvoices,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("contractor_settings").upsert(payload, {
      onConflict: "contractor_id",
    });

    if (error) {
      setErrorText(error.message);
      setSaving(false);
      return;
    }

    setSuccessText("Invoice settings saved.");
    setSaving(false);
  }

  if (loading || isLoading) {
    return (
      <div className={shared.loadingWrapper}>
        <p className={shared.loadingText}>Loading...</p>
      </div>
    );
  }

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
                  Example: 30 means invoices default to due 30 days after the issue date.
                </p>
              </div>

              <div className={styles.rightControl}>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={defaultDueDays}
                  onChange={(e) => setDefaultDueDays(e.target.value)}
                  className={shared.input}
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
            Automatically include a flat amount or percent to help cover indirect materials per invoice.
          </p>

          <div className={styles.cardBody}>
            <div className={styles.settingRow}>
              <div className={styles.settingText}>
                <p className={styles.settingTitle}>Type</p>
                <p className={styles.settingDesc}>
                  Choose whether the indirect materials charge is a dollar amount or a percentage.
                </p>
              </div>

              <div className={styles.rightControl}>
                <select
                  value={indirectType}
                  onChange={(e) => setIndirectType(e.target.value)}
                  className={shared.input}
                >
                  <option value="amount">$ Amount</option>
                  <option value="percent">% Percent</option>
                </select>
              </div>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingText}>
                <p className={styles.settingTitle}>Value</p>
                <p className={styles.settingDesc}>
                  If percent is selected, we’ll validate the value as 0–100.
                </p>
              </div>

              <div className={styles.rightControl}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={indirectValue}
                  onChange={(e) => setIndirectValue(e.target.value)}
                  className={shared.input}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Card 3: Enable % based invoices */}
        <section className={shared.card}>
          <h2 className={shared.cardTitle}>Percent-Based Invoices</h2>
          <p className={shared.cardSubtitle}>
            Enable the ability to create invoices based on a percent of an estimate or project total.
          </p>

          <div className={styles.cardBody}>
            <div className={styles.settingRow}>
              <div className={styles.settingText}>
                <p className={styles.settingTitle}>Enable % based invoices</p>
                <p className={styles.settingDesc}>
                  When enabled, invoice creation can support percentage-based billing flows.
                </p>
              </div>

              <div className={styles.rightControl}>
                <label className={styles.toggleWrap}>
                  <input
                    type="checkbox"
                    checked={enablePercentInvoices}
                    onChange={(e) => setEnablePercentInvoices(e.target.checked)}
                  />
                  <span className={styles.toggleLabel}>
                    {enablePercentInvoices ? "Enabled" : "Disabled"}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Save bar */}
        {errorText && <p className={shared.errorText}>{errorText}</p>}
        {successText && <p className={shared.successText}>{successText}</p>}

        <button type="submit" className={shared.primaryButton} disabled={saving}>
          {saving ? "Saving..." : "Save Invoice Settings"}
        </button>
      </form>
    </div>
  );
}
