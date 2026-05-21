//invoiceModal.js

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./InvoiceModal.module.css";
import { supabase } from "@/lib/supabaseClient";

import SearchableSelect from "@/components/common/SearchableSelect/SearchableSelect";
import Toast from "@/components/common/Toast/Toast";
import ConfirmDialog from "@/components/common/ConfirmDialog/ConfirmDialog";

import { NEW_SERVICE_OPTION, makeBlankLineItem, TAX_RATE } from "./invoiceConstants";
import {
  addDays,
  applyServiceToLineItem,
  clearLineItemService,
  computeTotals,
  generateDocumentNumber,
  setCustomService,
  toEditableLineItems,
  toLineItemsInsertPayload,
  validateLineItems,
  formatDateForInput,
} from "./invoiceUtils";

import {
  createInvoiceHeader,
  fetchClients,
  fetchDefaultDueDays,
  fetchFreshInvoice,
  fetchInvoiceLineItems,
  fetchServices,
  getAuthedUser,
  insertInvoiceLineItems,
  replaceInvoiceLineItems,
  resolveContractorId,
  sendInvoiceEmail,
  updateInvoiceHeader,
  fetchIndirectMaterialsDefaults,
} from "./invoiceQueries";

// ── Calendar sync helpers (non-fatal) ──────────────────────────────────────
async function syncInvoiceDueAppointment({ invoiceId, dueDate, invoiceNumber, clientName, accessToken, existingId }) {
  if (!dueDate || !accessToken) return existingId || null;
  try {
    const title = `${invoiceNumber} due — ${clientName || "Client"}`;
    const body = {
      title,
      type: "invoice_due",
      all_day: true,
      invoice_id: invoiceId,
      start_time: new Date(dueDate + "T00:00:00").toISOString(),
      end_time: new Date(dueDate + "T23:59:00").toISOString(),
    };
    const url = existingId ? `/api/calendar/appointments/${existingId}` : "/api/calendar/appointments";
    const res = await fetch(url, {
      method: existingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) return existingId || null;
    const json = await res.json();
    return json.data?.id || existingId || null;
  } catch {
    return existingId || null;
  }
}

async function syncInvoiceJobAppointment({ invoiceId, jobStart, jobEnd, jobLocation, invoiceNumber, clientName, accessToken, existingId }) {
  if (!jobStart || !jobEnd || !accessToken) return existingId || null;
  try {
    const title = `${invoiceNumber} — ${clientName || "Job"}`;
    const body = {
      title,
      type: "job_site_visit",
      all_day: false,
      invoice_id: invoiceId,
      start_time: new Date(jobStart).toISOString(),
      end_time: new Date(jobEnd).toISOString(),
      location: jobLocation?.trim() || null,
    };
    const url = existingId ? `/api/calendar/appointments/${existingId}` : "/api/calendar/appointments";
    const res = await fetch(url, {
      method: existingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) return existingId || null;
    const json = await res.json();
    return json.data?.id || existingId || null;
  } catch {
    return existingId || null;
  }
}
// ───────────────────────────────────────────────────────────────────────────

export default function InvoiceModal({
  open,
  onClose,
  onSaved,
  invoice = null,
  documentType = "invoice",
  jobId = null,
}) {
  const isEditMode = !!invoice;
  const actualDocType = isEditMode ? invoice?.document_type || "invoice" : documentType;
  const isEstimate = actualDocType === "estimate";
  const showLinkedJobField = !isEditMode && !!jobId;

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const [toast, setToast] = useState({ open: false, message: "", type: "error" });
  const showToast = useCallback((message, type = "error") => {
    setToast({ open: true, message, type });
  }, []);

  const [successMessage, setSuccessMessage] = useState("");
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  const sendAfterCreateRef = useRef(false);
  const dueDateTouchedRef = useRef(false);

  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [defaultDueDays, setDefaultDueDays] = useState(30);

  // Calendar appointment IDs linked to this invoice
  const [dueAppointmentId, setDueAppointmentId] = useState(null);
  const [jobAppointmentId, setJobAppointmentId] = useState(null);

  // Schedule appointment section
  const [scheduleJob, setScheduleJob] = useState(false);
  const [jobStart, setJobStart] = useState("");
  const [jobEnd, setJobEnd] = useState("");
  const [jobLocation, setJobLocation] = useState("");

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [lineItems, setLineItems] = useState([makeBlankLineItem()]);

  // -----------------------
  // Indirect materials (per invoice)
  // -----------------------
  const [indirectEnabled, setIndirectEnabled] = useState(false);
  const [indirectType, setIndirectType] = useState("amount"); // "amount" | "percent"
  const [indirectAmount, setIndirectAmount] = useState("0");
  const [indirectPercent, setIndirectPercent] = useState("0");

  // Recurring invoice options
  // -----------------------
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState("month");
  const [recurringDuration, setRecurringDuration] = useState(null);

  // Totals (memo)
  const totals = useMemo(
    () =>
      computeTotals(lineItems, {
        enabled: indirectEnabled,
        type: indirectType,
        amount: indirectAmount,
        percent: indirectPercent,
      }),
    [lineItems, indirectEnabled, indirectType, indirectAmount, indirectPercent]
  );

  const { baseSubtotal, indirectCharge, subtotal, taxAmount, total } = totals || {
    baseSubtotal: 0,
    indirectCharge: 0,
    subtotal: 0,
    taxAmount: 0,
    total: 0,
  };

  const resetForm = useCallback(
    (dueDaysToUse, indirectDefaults) => {
      const today = new Date();
      const issue = formatDateForInput(today);
      const due = addDays(issue, dueDaysToUse ?? defaultDueDays);

      setInvoiceNumber(generateDocumentNumber(actualDocType));
      setClientId("");
      setSelectedClient(null);
      setIssueDate(issue);
      setDueDate(due || issue);
      setStatus("draft");
      setNotes("");
      setInternalNotes("");
      setLineItems([makeBlankLineItem()]);
      setIsRecurring(false);
      setRecurringInterval("month");
      setRecurringDuration(null);

      if (indirectDefaults) {
        setIndirectEnabled(!!indirectDefaults.enabled);
        setIndirectType(indirectDefaults.defaultType === "percent" ? "percent" : "amount");
        setIndirectAmount(String(indirectDefaults.amount ?? 0));
        setIndirectPercent(String(indirectDefaults.percent ?? 0));
      } else {
        setIndirectEnabled(false);
        setIndirectType("amount");
        setIndirectAmount("0");
        setIndirectPercent("0");
      }

      setDueAppointmentId(null);
      setJobAppointmentId(null);
      setScheduleJob(false);
      setJobStart("");
      setJobEnd("");
      setJobLocation("");

      dueDateTouchedRef.current = false;
      sendAfterCreateRef.current = false;
    },
    [actualDocType, defaultDueDays]
  );

  const loadInvoiceIntoForm = useCallback(async (invoiceData) => {
    setInvoiceNumber(invoiceData.invoice_number || "");
    const extractedClientId = invoiceData.client_id || invoiceData.clients?.id || "";
    setClientId(extractedClientId);

    setIssueDate(invoiceData.issue_date || "");
    setDueDate(invoiceData.due_date || "");
    setStatus(invoiceData.status || "draft");
    setNotes(invoiceData.notes || "");
    setInternalNotes(invoiceData.internal_notes || "");

    setIndirectEnabled(!!invoiceData.enable_indirect_materials);
    setIndirectAmount(String(invoiceData.indirect_materials_amount ?? 0));
    setIndirectPercent(String(invoiceData.indirect_materials_percent ?? 0));
    setIndirectType(
      invoiceData.indirect_materials_default_type === "percent" ? "percent" : "amount"
    );

    if (invoiceData.clients) setSelectedClient(invoiceData.clients);

    setDueAppointmentId(invoiceData.due_appointment_id || null);
    setJobAppointmentId(invoiceData.job_appointment_id || null);
    setScheduleJob(!!invoiceData.job_appointment_id);

    const rows = await fetchInvoiceLineItems(invoiceData.id);
    setLineItems(toEditableLineItems(rows));
  }, []);

  useEffect(() => {
    if (!open) return;

    const init = async () => {
      setLoadingData(true);
      try {
        const [authedUser, sessionData] = await Promise.all([
          getAuthedUser(),
          supabase.auth.getSession(),
        ]);
        setUser(authedUser);
        setAccessToken(sessionData?.data?.session?.access_token || null);

        const contractorId = await resolveContractorId(authedUser.id);

        const [dueDays, indirectDefaults, clientsData, servicesData] = await Promise.all([
          fetchDefaultDueDays(contractorId),
          fetchIndirectMaterialsDefaults(contractorId),
          fetchClients(),
          fetchServices(),
        ]);

        setDefaultDueDays(dueDays);
        setClients(clientsData);
        setServices(servicesData);

        if (isEditMode && invoice?.id) {
          const fresh = await fetchFreshInvoice(invoice.id).catch(() => invoice);
          await loadInvoiceIntoForm(fresh);

          const idToMatch = fresh?.client_id || invoice.client_id;
          if (idToMatch) {
            const fullClient = clientsData.find((c) => c.id === idToMatch);
            if (fullClient) setSelectedClient(fullClient);
          }
        } else {
          resetForm(dueDays, indirectDefaults);
        }
      } catch (err) {
        console.error(err);
        showToast("You must be logged in to manage invoices.");
      } finally {
        setLoadingData(false);
      }
    };

    init();
  }, [open, isEditMode, invoice, loadInvoiceIntoForm, resetForm, showToast]);

  useEffect(() => {
    if (!open) return;
    if (isEditMode) return;
    if (!issueDate) return;

    if (!dueDateTouchedRef.current) {
      const nextDue = addDays(issueDate, defaultDueDays);
      if (nextDue) setDueDate(nextDue);
    }
  }, [open, isEditMode, issueDate, defaultDueDays]);

  if (!open) return null;

  const handleAddLineItem = () => setLineItems((prev) => [...prev, makeBlankLineItem()]);
  const handleRemoveLineItem = (index) =>
    setLineItems((prev) => prev.filter((_, i) => i !== index));

  const handleLineItemFieldChange = (index, field, value) => {
    setLineItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const handleServiceSelect = (index, selectedValue) => {
    if (selectedValue === NEW_SERVICE_OPTION) {
      setLineItems((prev) => prev.map((it, i) => (i === index ? setCustomService(it) : it)));
      return;
    }

    if (!selectedValue) {
      setLineItems((prev) => prev.map((it, i) => (i === index ? clearLineItemService(it) : it)));
      return;
    }

    const service = services.find((s) => s.id === selectedValue);
    setLineItems((prev) =>
      prev.map((it, i) => (i === index ? applyServiceToLineItem(it, service) : it))
    );
  };

  const handleSendClick = () => {
    if (!user || !invoice) {
      showToast("Please save the invoice first before sending.", "warning");
      return;
    }
    if (!selectedClient?.email) {
      showToast(
        "This client doesn't have an email address. Please add one in the Clients page first.",
        "warning"
      );
      return;
    }
    setShowSendConfirm(true);
  };

  const doSend = async (invoiceIdToSend) => {
    setSending(true);
    try {
      const result = await sendInvoiceEmail({ invoiceId: invoiceIdToSend, userId: user.id });

      if (result.statusUpdated) setStatus("sent");

      setSuccessMessage(`${isEstimate ? "Estimate" : "Invoice"} sent to ${result.clientEmail}`);

      if (typeof onSaved === "function" && result.statusUpdated) {
        const base = isEditMode ? invoice : { id: invoiceIdToSend };
        onSaved({ ...base, status: "sent" });
      }

      setTimeout(() => {
        setSuccessMessage("");
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleConfirmSend = async () => {
    setShowSendConfirm(false);
    if (!invoice?.id) return;
    await doSend(invoice.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      showToast("No user found. Please log in again.");
      return;
    }

    if (!clientId) {
      showToast("Please select a client.", "warning");
      return;
    }

    if (!issueDate || !dueDate) {
      showToast("Please select issue date and due date.", "warning");
      return;
    }

    const { valid, isEmpty } = validateLineItems(lineItems);
    if (isEmpty) {
      showToast("Please add at least one valid line item.", "warning");
      return;
    }

    const amt = Number(indirectAmount);
    const pct = Number(indirectPercent);
    if (indirectEnabled) {
      if (indirectType === "amount" && (!Number.isFinite(amt) || amt < 0)) {
        showToast("Indirect materials amount must be 0 or greater.", "warning");
        return;
      }
      if (indirectType === "percent" && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
        showToast("Indirect materials percent must be between 0 and 100.", "warning");
        return;
      }
    }

    setSaving(true);

    try {
      if (isEditMode && invoice?.id) {
        const updated = await updateInvoiceHeader({
          invoiceId: invoice.id,
          clientId,
          invoiceNumber,
          issueDate,
          dueDate,
          status,
          notes,
          internalNotes,
          subtotal,
          taxAmount,
          total,

          enableIndirectMaterials: indirectEnabled,
          indirectMaterialsAmount: Number(indirectAmount),
          indirectMaterialsPercent: Number(indirectPercent),
          indirectMaterialsDefaultType: indirectType,
        });

        const payload = toLineItemsInsertPayload({ invoiceId: invoice.id, lineItems: valid });
        await replaceInvoiceLineItems({ invoiceId: invoice.id, payload });

        // Sync calendar appointments (non-fatal)
        if (!isEstimate) {
          try {
            const newDueId = await syncInvoiceDueAppointment({
              invoiceId: invoice.id,
              dueDate,
              invoiceNumber,
              clientName: selectedClient?.name,
              accessToken,
              existingId: dueAppointmentId,
            });
            if (newDueId && newDueId !== dueAppointmentId) {
              await supabase.from("invoices").update({ due_appointment_id: newDueId }).eq("id", invoice.id);
              setDueAppointmentId(newDueId);
            }
            if (scheduleJob && jobStart && jobEnd) {
              const newJobId = await syncInvoiceJobAppointment({
                invoiceId: invoice.id,
                jobStart,
                jobEnd,
                jobLocation,
                invoiceNumber,
                clientName: selectedClient?.name,
                accessToken,
                existingId: jobAppointmentId,
              });
              if (newJobId && newJobId !== jobAppointmentId) {
                await supabase.from("invoices").update({ job_appointment_id: newJobId }).eq("id", invoice.id);
                setJobAppointmentId(newJobId);
              }
            }
          } catch (calErr) {
            console.warn("Calendar sync failed (non-fatal):", calErr);
          }
        }

        if (typeof onSaved === "function") onSaved(updated);
        onClose();
        return;
      }

      const created = await createInvoiceHeader({
        userId: user.id,
        clientId,
        invoiceNumber,
        issueDate,
        dueDate,
        status,
        notes,
        internalNotes,
        subtotal,
        taxAmount,
        total,
        documentType: actualDocType,
        jobId,

        enableIndirectMaterials: indirectEnabled,
        indirectMaterialsAmount: Number(indirectAmount),
        indirectMaterialsPercent: Number(indirectPercent),
        indirectMaterialsDefaultType: indirectType,
      });

      const payload = toLineItemsInsertPayload({ invoiceId: created.id, lineItems: valid });
      await insertInvoiceLineItems(payload);

      // Create recurring contract if enabled
      if (isRecurring && accessToken) {
        try {
          const contractPayload = {
            client_id: clientId,
            title: lineItems[0]?.description || "Recurring Service",
            amount: total,
            interval: recurringInterval,
            interval_count: 1,
            duration_months: recurringDuration,
          };

          const contractRes = await fetch("/api/contracts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(contractPayload),
          });

          if (contractRes.ok) {
            const contractData = await contractRes.json();
            const contractId = contractData.data?.id;

            // Send setup link email
            if (contractId) {
              await fetch(`/api/contracts/${contractId}/send-setup`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });
            }
          }
        } catch (err) {
          console.warn("Recurring contract creation failed (non-fatal):", err);
        }
      }

      // Sync calendar appointments (non-fatal)
      if (!isEstimate) {
        try {
          const newDueId = await syncInvoiceDueAppointment({
            invoiceId: created.id,
            dueDate,
            invoiceNumber,
            clientName: selectedClient?.name,
            accessToken,
            existingId: null,
          });
          if (newDueId) {
            await supabase.from("invoices").update({ due_appointment_id: newDueId }).eq("id", created.id);
          }
          if (scheduleJob && jobStart && jobEnd) {
            const newJobId = await syncInvoiceJobAppointment({
              invoiceId: created.id,
              jobStart,
              jobEnd,
              jobLocation,
              invoiceNumber,
              clientName: selectedClient?.name,
              accessToken,
              existingId: null,
            });
            if (newJobId) {
              await supabase.from("invoices").update({ job_appointment_id: newJobId }).eq("id", created.id);
            }
          }
        } catch (calErr) {
          console.warn("Calendar sync failed (non-fatal):", calErr);
        }
      }

      if (sendAfterCreateRef.current) {
        sendAfterCreateRef.current = false;
        if (typeof onSaved === "function") onSaved(created);
        await doSend(created.id);
        return;
      }

      if (typeof onSaved === "function") onSaved(created);
      onClose();
    } catch (err) {
      console.error("Save invoice failed:", err);

      const msg =
        err?.message ||
        err?.error?.message ||
        err?.details ||
        err?.hint ||
        "Unexpected error saving. Please try again.";

      showToast(msg);
    } finally {
      setSaving(false);
      sendAfterCreateRef.current = false;
    }
  };

  return (
    <>
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />

      <ConfirmDialog
        open={showSendConfirm}
        title="Ready to send?"
        message={`${isEstimate ? "Estimate" : "Invoice"} will be sent to:\nClient: ${
          selectedClient?.name || "—"
        }\nEmail: ${selectedClient?.email || "—"}`}
        confirmLabel="Send Now"
        cancelLabel="Cancel"
        confirmType="primary"
        onConfirm={handleConfirmSend}
        onCancel={() => setShowSendConfirm(false)}
      />

      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2 className={styles.title}>
              {isEditMode
                ? isEstimate
                  ? "Edit Estimate"
                  : "Edit Invoice"
                : isEstimate
                ? "Create Estimate"
                : "Create Invoice"}
            </h2>

            <button
              className={styles.closeButton}
              onClick={onClose}
              disabled={saving || sending}
              aria-label="Close"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M1 1L13 13M1 13L13 1" />
              </svg>
            </button>
          </div>

          <div className={styles.body}>
            {successMessage && (
              <div className={styles.successBanner}>
                <svg className={styles.successIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            {loadingData ? (
              <div className={styles.loadingBox}>Loading...</div>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.topRow}>
                  <div className={styles.topRowLeft}>
                    <div className={styles.field}>
                      <label className={styles.label}>
                        {isEstimate ? "Estimate Number" : "Invoice Number"}
                      </label>
                      <div className={styles.readonlyValue}>
                        {invoiceNumber || (isEditMode ? "—" : "Generating...")}
                      </div>
                    </div>
                  </div>

                  <div className={styles.topRowRight}>
                    <div className={styles.field}>
                      <label className={styles.label}>Client</label>
                      <SearchableSelect
                        value={clientId}
                        onChange={(val) => {
                          setClientId(val);
                          const c = clients.find((x) => x.id === val);
                          setSelectedClient(c || null);
                        }}
                        options={clients.map((c) => ({ value: c.id, label: c.name }))}
                        placeholder="Select a client"
                        disabled={saving || sending}
                      />
                    </div>
                  </div>
                </div>

                {showLinkedJobField && (
                  <div className={styles.field}>
                    <label className={styles.label}>Linked Job ID</label>
                    <div className={styles.readonlyValue}>{jobId}</div>
                  </div>
                )}

                <div className={styles.gridTwoCols}>
                  <div className={styles.field}>
                    <label className={styles.label}>Issue Date</label>
                    <input
                      className={styles.input}
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      disabled={saving || sending}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Due Date</label>
                    <input
                      className={styles.input}
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        dueDateTouchedRef.current = true;
                        setDueDate(e.target.value);
                      }}
                      disabled={saving || sending}
                      required
                    />
                  </div>
                </div>

                {/* Recurring Invoice Options */}
                {!isEstimate && (
                  <div className={styles.section}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        disabled={saving || sending}
                      />
                      <span>Make this invoice recurring</span>
                    </label>

                    {isRecurring && (
                      <div className={styles.recurringOptions}>
                        <div className={styles.recurringRow}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Billing Interval</label>
                            <select
                              className={styles.input}
                              value={recurringInterval}
                              onChange={(e) => setRecurringInterval(e.target.value)}
                              disabled={saving || sending}
                            >
                              <option value="month">Monthly</option>
                              <option value="quarter">Quarterly</option>
                              <option value="year">Annually</option>
                            </select>
                          </div>

                          <div className={styles.formGroup}>
                            <label className={styles.label}>Duration</label>
                            <select
                              className={styles.input}
                              value={recurringDuration || ""}
                              onChange={(e) => setRecurringDuration(e.target.value ? parseInt(e.target.value) : null)}
                              disabled={saving || sending}
                            >
                              <option value="">Ongoing (no end date)</option>
                              <option value="3">3 months</option>
                              <option value="6">6 months</option>
                              <option value="12">12 months</option>
                              <option value="24">24 months</option>
                            </select>
                          </div>
                        </div>
                        <p className={styles.recurringInfo}>
                          Client will be sent a setup link to activate automatic payments. Each billing period, an invoice will be auto-generated.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>Line Items</h3>
                    <button
                      type="button"
                      className={styles.addLineButton}
                      onClick={handleAddLineItem}
                      disabled={saving || sending}
                    >
                      + Add line item
                    </button>
                  </div>

                  <div className={styles.lineItemsTable}>
                    <div className={styles.lineItemsHeaderRow}>
                      <div className={styles.colService}>Service</div>
                      <div className={styles.colName}>Description</div>
                      <div className={styles.colQty}>Qty</div>
                      <div className={styles.colRate}>Rate</div>
                      <div className={styles.colRemove}></div>
                    </div>

                    {lineItems.map((item, index) => (
                      <div key={index} className={styles.lineItemRow}>
                        <div className={styles.colService}>
                          <SearchableSelect
                            value={item.serviceId || ""}
                            onChange={(val) => handleServiceSelect(index, val)}
                            options={[
                              { value: NEW_SERVICE_OPTION, label: "Custom Service" },
                              ...services.map((s) => ({
                                value: s.id,
                                label: s.is_favorite ? `⭐ ${s.name}` : s.name,
                              })),
                            ]}
                            placeholder="Select service"
                            disabled={saving || sending}
                          />
                        </div>

                        <div className={styles.colName}>
                          <input
                            className={styles.input}
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleLineItemFieldChange(index, "description", e.target.value)
                            }
                            placeholder="Description on invoice"
                            disabled={saving || sending}
                            required
                          />
                        </div>

                        <div className={styles.colQty}>
                          <input
                            className={styles.input}
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleLineItemFieldChange(index, "quantity", e.target.value)
                            }
                            disabled={saving || sending}
                            required
                          />
                        </div>

                        <div className={styles.colRate}>
                          <input
                            className={styles.input}
                            type="number"
                            min="0"
                            step="1"
                            value={item.rate}
                            onChange={(e) => handleLineItemFieldChange(index, "rate", e.target.value)}
                            disabled={saving || sending}
                            required
                          />
                        </div>

                        <div className={styles.colRemove}>
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              className={styles.removeLineButton}
                              onClick={() => handleRemoveLineItem(index)}
                              disabled={saving || sending}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.footerRow}>
                  <div className={styles.notesField}>
                    <label className={styles.label}>Notes (shown on invoice)</label>
                    <textarea
                      className={styles.textarea}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={saving || sending}
                      placeholder="Optional notes to your customer (payment terms, thank you note, etc.)"
                    />

                    <label className={styles.label}>Internal Notes (not shown on invoice)</label>
                    <textarea
                      className={`${styles.textarea} ${styles.internalNotes}`}
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      disabled={saving || sending}
                      placeholder="Internal notes (not shown to customer)"
                    />
                  </div>

                  <div className={styles.totalsColumn}>
                    <div className={styles.indirectBox}>
                      <div className={styles.indirectHeader}>
                        <span className={styles.indirectTitle}>Indirect materials</span>

                        <button
                          type="button"
                          className={`${styles.indirectToggle} ${
                            indirectEnabled ? styles.indirectOn : styles.indirectOff
                          }`}
                          onClick={() => setIndirectEnabled((v) => !v)}
                          disabled={saving || sending}
                        >
                          {indirectEnabled ? "Enabled" : "Disabled"}
                        </button>
                      </div>

                      {indirectEnabled && (
                        <div className={styles.indirectControls}>
                          <select
                            className={styles.indirectSelect}
                            value={indirectType}
                            onChange={(e) => setIndirectType(e.target.value)}
                            disabled={saving || sending}
                          >
                            <option value="amount">$ Amount</option>
                            <option value="percent">% Percent</option>
                          </select>

                          {indirectType === "amount" ? (
                            <input
                              className={styles.indirectInput}
                              type="number"
                              min="0"
                              step="1"
                              value={indirectAmount}
                              onChange={(e) => setIndirectAmount(e.target.value)}
                              disabled={saving || sending}
                            />
                          ) : (
                            <input
                              className={styles.indirectInput}
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={indirectPercent}
                              onChange={(e) => setIndirectPercent(e.target.value)}
                              disabled={saving || sending}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className={styles.totalsBox}>
                      <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Line items</span>
                        <span className={styles.totalValue}>
                          ${Number(baseSubtotal ?? 0).toFixed(2)}
                        </span>
                      </div>

                      {indirectEnabled && Number(indirectCharge ?? 0) > 0 && (
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Indirect materials</span>
                          <span className={styles.totalValue}>
                            ${Number(indirectCharge ?? 0).toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Subtotal</span>
                        <span className={styles.totalValue}>
                          ${Number(subtotal ?? 0).toFixed(2)}
                        </span>
                      </div>

                      <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                        <span className={styles.totalValue}>
                          ${Number(taxAmount ?? 0).toFixed(2)}
                        </span>
                      </div>

                      <div className={styles.totalDivider} />

                      <div className={styles.totalRowFinal}>
                        <span className={styles.totalLabelFinal}>Total</span>
                        <span className={styles.totalValueFinal}>
                          ${Number(total ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={onClose}
                    disabled={saving || sending}
                  >
                    Cancel
                  </button>

                  {isEditMode && (
                    <button
                      type="button"
                      className={styles.sendButton}
                      onClick={handleSendClick}
                      disabled={saving || sending || !selectedClient?.email}
                      title={
                        !selectedClient?.email
                          ? "Client has no email address"
                          : isEstimate
                          ? "Send estimate to client"
                          : "Send invoice to client"
                      }
                    >
                      {sending ? (
                        "Sending..."
                      ) : (
                        <>
                          <svg
                            className={styles.sendIcon}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m22 2-7 20-4-9-9-4 20-7Z" />
                            <path d="M22 2 11 13" />
                          </svg>
                          {isEstimate ? "Send Estimate" : "Send Invoice"}
                        </>
                      )}
                    </button>
                  )}

                  {(isEditMode || !isEstimate) && (
                    <button type="submit" className={styles.saveButton} disabled={saving || sending}>
                      {saving
                        ? isEditMode
                          ? "Saving..."
                          : "Creating..."
                        : isEditMode
                        ? "Save Changes"
                        : "Create & Save"}
                    </button>
                  )}

                  {!isEditMode && !isEstimate && (
                    <button
                      type="submit"
                      className={styles.createAndSendButton}
                      disabled={saving || sending || !selectedClient?.email}
                      onClick={() => {
                        sendAfterCreateRef.current = true;
                      }}
                      title={
                        !selectedClient?.email
                          ? "Select a client with an email address to send immediately"
                          : "Create and send invoice to client"
                      }
                    >
                      {sending ? "Sending..." : "Create & Send Invoice"}
                    </button>
                  )}

                  {!isEditMode && isEstimate && (
                    <button
                      type="submit"
                      className={styles.createAndSendButton}
                      disabled={saving || sending || !selectedClient?.email}
                      onClick={() => {
                        sendAfterCreateRef.current = true;
                      }}
                      title={
                        !selectedClient?.email
                          ? "Select a client with an email address to send the estimate"
                          : "Create and send estimate to client"
                      }
                    >
                      {saving ? "Creating..." : sending ? "Sending..." : "Create & Send Estimate"}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}