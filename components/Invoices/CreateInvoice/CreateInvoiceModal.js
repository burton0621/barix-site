"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./CreateInvoiceModal.module.css";
import SearchableSelect from "@/components/common/SearchableSelect/SearchableSelect";

const TAX_RATE = 0.06;
const NEW_SERVICE_OPTION = "__new_service__";

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
    { serviceId: "", name: "", description: "", quantity: "1", rate: "" },
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

      // Fetch services (owner-scoped via RLS) INCLUDING description
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, default_rate, description")
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
      setLineItems([
        { serviceId: "", name: "", description: "", quantity: "1", rate: "" },
      ]);

      setLoadingData(false);
    }

    init();
  }, [open]);

  if (!open) return null;

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { serviceId: "", name: "", description: "", quantity: "1", rate: "" },
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

  const handleServiceSelect = (index, selectedValue) => {
    // 1) New custom service
    if (selectedValue === NEW_SERVICE_OPTION) {
      setLineItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                serviceId: NEW_SERVICE_OPTION,
                // keep existing name/description/rate as-is
              }
            : item
        )
      );
      return;
    }

    // 2) Clear selection
    if (!selectedValue) {
      setLineItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                serviceId: "",
                name: "",
                description: "",
                rate: "",
              }
            : item
        )
      );
      return;
    }

    // 3) Existing service selected
    const selectedService =
      services.find((s) => s.id === selectedValue) || null;

    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        return {
          ...item,
          serviceId: selectedValue,
          // Keep name in state for DB, but we display description in the UI
          name: selectedService ? selectedService.name : "",
          description: selectedService?.description || "",
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

    const validLineItems = lineItems.filter((item) => {
      const hasDesc = item.description && item.description.trim() !== "";
      const hasName = item.name && item.name.trim() !== "";
      const qtyOk = parseFloat(item.quantity || "0") > 0;
      return (hasDesc || hasName) && qtyOk;
    });

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

      // 2) Insert line items (with description)
      const lineItemsPayload = validLineItems.map((item, index) => {
        const qty = parseFloat(item.quantity || "0");
        const rate = parseFloat(item.rate || "0");
        const lineTotal =
          !isNaN(qty) && !isNaN(rate) ? qty * rate : 0;

        const rawName = (item.name || "").trim();
        const rawDesc = (item.description || "").trim();

        // If name is empty, fall back to description (or a generic label)
        const finalName =
          rawName || (rawDesc ? rawDesc.slice(0, 80) : "Line item");

        return {
          invoice_id: invoice.id,
          name: finalName,
          description: rawDesc || null,
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
                  <SearchableSelect
                    value={clientId}
                    onChange={(val) => setClientId(val)}
                    options={clients.map((client) => ({
                      value: client.id,
                      label: client.name,
                    }))}
                    placeholder="Select a client"
                    disabled={saving}
                  />
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
                    <div className={styles.colName}>Description</div>
                    <div className={styles.colQty}>Qty</div>
                    <div className={styles.colRate}>Rate</div>
                    <div className={styles.colRemove}></div>
                  </div>

                  {lineItems.map((item, index) => (
                    <div key={index} className={styles.lineItemRow}>
                      {/* Service select */}
                      <div className={styles.colService}>
                        <SearchableSelect
                          value={item.serviceId || ""}
                          onChange={(val) => handleServiceSelect(index, val)}
                          options={[
                            {
                              value: NEW_SERVICE_OPTION,
                              label: "Custom Service",
                            },
                            ...services.map((s) => ({
                              value: s.id,
                              label: s.name,
                            })),
                          ]}
                          placeholder="Select service"
                          disabled={saving}
                        />
                      </div>

                      {/* Description (shown on invoice) */}
                      <div className={styles.colName}>
                        <input
                          className={styles.input}
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            handleLineItemFieldChange(
                              index,
                              "description",
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
