"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./CreateInvoiceModal.module.css";

const TAX_RATE = 0.06;

function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000; // 4-digit random

  return `INV-${year}${month}${day}-${rand}`;
}

export default function CreateInvoiceModal({ open, onClose, onCreated }) {
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");

  const [lineItems, setLineItems] = useState([
    { serviceId: "", name: "", quantity: "1", rate: "" },
  ]);

  // When modal opens, load user/clients/services + reset form
  useEffect(() => {
    if (!open) return;

    async function init() {
      setLoadingData(true);

      // Get user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(userError);
        alert("You must be logged in to create an invoice.");
        setLoadingData(false);
        return;
      }

      setUser(user);

      // Fetch clients (owner-scoped via RLS)
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name")
        .order("name", { ascending: true });

      if (clientsError) {
        console.error(clientsError);
      } else {
        setClients(clientsData || []);
      }

      // Fetch services (owner-scoped via RLS)
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, default_rate")
        .order("name", { ascending: true });

      if (servicesError) {
        console.error(servicesError);
      } else {
        setServices(servicesData || []);
      }

      // Default dates: today + 30 days
    const today = new Date();
    const in30 = new Date();
    in30.setDate(today.getDate() + 30);

    const formatDate = (d) => d.toISOString().slice(0, 10);
    setIssueDate(formatDate(today));
    setDueDate(formatDate(in30));

    // Reset basic fields
    setInvoiceNumber(generateInvoiceNumber());
    setStatus("draft");
    setNotes("");
    setLineItems([{ serviceId: "", name: "", quantity: "1", rate: "" }]);


      setLoadingData(false);
    }

    init();
  }, [open]);

  if (!open) return null;

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { serviceId: "", name: "", quantity: "1", rate: "" },
    ]);
  };

  const handleRemoveLineItem = (index) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineItemFieldChange = (index, field, value) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleServiceSelect = (index, serviceId) => {
    const selectedService = services.find((s) => s.id === serviceId) || null;

    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        return {
          ...item,
          serviceId,
          name: selectedService ? selectedService.name : "",
          rate:
            selectedService && selectedService.default_rate != null
              ? String(selectedService.default_rate)
              : "",
        };
      })
    );
  };

  const computeTotals = () => {
    let subtotal = 0;

    lineItems.forEach((item) => {
      const qty = parseFloat(item.quantity || "0");
      const rate = parseFloat(item.rate || "0");

      if (!isNaN(qty) && !isNaN(rate)) {
        subtotal += qty * rate;
      }
    });

    const taxAmount = subtotal * TAX_RATE;
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const { subtotal, taxAmount, total } = computeTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("No user found. Please log in again.");
      return;
    }

    if (!clientId) {
      alert("Please select a client.");
      return;
    }

    if (!issueDate || !dueDate) {
      alert("Please select issue date and due date.");
      return;
    }

    const validLineItems = lineItems.filter(
      (item) => item.name.trim() !== "" && parseFloat(item.quantity || "0") > 0
    );

    if (validLineItems.length === 0) {
      alert("Please add at least one valid line item.");
      return;
    }

    setSaving(true);

    try {
      // 1) Insert invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          owner_id: user.id,
          client_id: clientId,
          invoice_number: invoiceNumber || null,
          issue_date: issueDate,
          due_date: dueDate,
          status,
          notes: notes || null,
          subtotal,
          tax_rate: TAX_RATE,
          tax_amount: taxAmount,
          total,
        })
        .select("*")
        .single();

      if (invoiceError) {
        console.error(invoiceError);
        alert(`Error creating invoice: ${invoiceError.message}`);
        setSaving(false);
        return;
      }

      // 2) Insert line items
      const lineItemsPayload = validLineItems.map((item, index) => {
        const qty = parseFloat(item.quantity || "0");
        const rate = parseFloat(item.rate || "0");
        const lineTotal =
          !isNaN(qty) && !isNaN(rate) ? qty * rate : 0;

        return {
          invoice_id: invoice.id,
          name: item.name.trim(),
          quantity: qty,
          rate,
          line_total: lineTotal,
          position: index + 1,
        };
      });

      const { error: lineItemsError } = await supabase
        .from("invoice_line_items")
        .insert(lineItemsPayload);

      if (lineItemsError) {
        console.error(lineItemsError);
        alert(
          `Invoice created, but there was an error saving line items: ${lineItemsError.message}`
        );
        setSaving(false);
        return;
      }

      if (typeof onCreated === "function") {
        onCreated(invoice);
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert("Unexpected error creating invoice.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Create Invoice</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {loadingData ? (
            <div className={styles.loadingBox}>Loading...</div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              {/* Top meta section */}
              <div className={styles.gridTwoCols}>
                <div className={styles.field}>
                    <label className={styles.label}>Invoice Number</label>
                    <div className={styles.readonlyValue}>
                        {invoiceNumber || "Generating..."}
                    </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Client</label>
                  <select
                    className={styles.select}
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    disabled={saving}
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Issue Date</label>
                  <input
                    className={styles.input}
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Due Date</label>
                  <input
                    className={styles.input}
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Status</label>
                  <select
                    className={styles.select}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={saving}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Line Items</h3>
                  <button
                    type="button"
                    className={styles.addLineButton}
                    onClick={handleAddLineItem}
                    disabled={saving}
                  >
                    + Add line item
                  </button>
                </div>

                <div className={styles.lineItemsTable}>
                  <div className={styles.lineItemsHeaderRow}>
                    <div className={styles.colService}>Service</div>
                    <div className={styles.colName}>Name</div>
                    <div className={styles.colQty}>Qty</div>
                    <div className={styles.colRate}>Rate</div>
                    <div className={styles.colRemove}></div>
                  </div>

                  {lineItems.map((item, index) => (
                    <div
                      key={index}
                      className={styles.lineItemRow}
                    >
                      {/* Service select */}
                      <div className={styles.colService}>
                        <select
                          className={styles.select}
                          value={item.serviceId}
                          onChange={(e) =>
                            handleServiceSelect(index, e.target.value)
                          }
                          disabled={saving}
                        >
                          <option value="">Select service</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Name (editable, in case they want to tweak wording) */}
                      <div className={styles.colName}>
                        <input
                          className={styles.input}
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            handleLineItemFieldChange(
                              index,
                              "name",
                              e.target.value
                            )
                          }
                          placeholder="Description on invoice"
                          disabled={saving}
                          required
                        />
                      </div>

                      {/* Quantity */}
                      <div className={styles.colQty}>
                        <input
                          className={styles.input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            handleLineItemFieldChange(
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                          disabled={saving}
                          required
                        />
                      </div>

                      {/* Rate (pre-filled from service, but editable) */}
                      <div className={styles.colRate}>
                        <input
                          className={styles.input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) =>
                            handleLineItemFieldChange(
                              index,
                              "rate",
                              e.target.value
                            )
                          }
                          disabled={saving}
                          required
                        />
                      </div>

                      {/* Remove */}
                      <div className={styles.colRemove}>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            className={styles.removeLineButton}
                            onClick={() => handleRemoveLineItem(index)}
                            disabled={saving}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes + Totals */}
              <div className={styles.footerRow}>
                <div className={styles.notesField}>
                  <label className={styles.label}>
                    Notes (shown on invoice)
                  </label>
                  <textarea
                    className={styles.textarea}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={saving}
                    placeholder="Optional notes to your customer (payment terms, thank you note, etc.)"
                  />
                </div>

                <div className={styles.totalsBox}>
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Subtotal</span>
                    <span className={styles.totalValue}>
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>
                      Tax ({(TAX_RATE * 100).toFixed(0)}%)
                    </span>
                    <span className={styles.totalValue}>
                      ${taxAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.totalRowFinal}>
                    <span className={styles.totalLabelFinal}>Total</span>
                    <span className={styles.totalValueFinal}>
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={saving}
                >
                  {saving ? "Creating..." : "Create Invoice"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
