"use client";

/*
  Invoice/Estimate Modal
  ----------------------
  A unified modal for creating and editing invoices and estimates.
  
  - Pass documentType="estimate" for estimates, "invoice" for invoices
  - When an existing invoice/estimate is passed via the `invoice` prop, 
    the modal switches to edit mode
  
  Workflow:
  - Estimates: Create → Send → Client accepts → Converts to invoice
  - Invoices: Create → Send → Client pays
*/

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./InvoiceModal.module.css";
import SearchableSelect from "@/components/common/SearchableSelect/SearchableSelect";
import Toast from "@/components/common/Toast/Toast";
import ConfirmDialog from "@/components/common/ConfirmDialog/ConfirmDialog";

// The tax rate is currently fixed at 6% - this could be made dynamic later
// if different users or states require different tax rates
const TAX_RATE = 0.06;
const NEW_SERVICE_OPTION = "__new_service__";

/*
  Generates a unique document number using the current date and a random 4-digit suffix.
  Format: EST-YYYYMMDD-XXXX for estimates, INV-YYYYMMDD-XXXX for invoices
*/
function generateDocumentNumber(docType = "invoice") {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;

  const prefix = docType === "estimate" ? "EST" : "INV";
  return `${prefix}-${year}${month}${day}-${rand}`;
}

export default function InvoiceModal({ open, onClose, onSaved, invoice = null, documentType = "invoice" }) {
  // Determine if we're in edit mode based on whether an invoice was passed in
  const isEditMode = !!invoice;
  
  // Determine the actual document type - use the invoice's type if editing, otherwise use prop
  const actualDocType = isEditMode ? (invoice.document_type || "invoice") : documentType;
  const isEstimate = actualDocType === "estimate";

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Success message state - shows a confirmation instead of browser alert
  const [successMessage, setSuccessMessage] = useState("");
  
  // Confirmation state - shows a user-friendly confirm dialog before sending
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  
  // Toast notification state - for error messages
  const [toast, setToast] = useState({ open: false, message: "", type: "error" });
  
  // Helper to show toast notifications
  const showToast = (message, type = "error") => {
    setToast({ open: true, message, type });
  };
  
  // Track if we should send immediately after creating (for "Create & Send" button)
  // Using a ref instead of state because we need the value immediately in the submit handler
  const sendAfterCreateRef = useRef(false);

  const [user, setUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);

  // Store the full client info when editing, so we can check if they have an email
  const [selectedClient, setSelectedClient] = useState(null);

  // Form state for the invoice header fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Line items are stored as an array of objects, each representing a single line on the invoice
  const [lineItems, setLineItems] = useState([
    { serviceId: "", name: "", description: "", quantity: "1", rate: "" },
  ]);

  /*
    Helper function to format a Date object into YYYY-MM-DD format for HTML date inputs.
    This is needed because the date input expects this specific format.
  */
  const formatDateForInput = (d) => d.toISOString().slice(0, 10);

  /*
    Resets all form fields to their default empty/initial state.
    Called when switching from edit mode back to create mode or when closing the modal.
  */
  const resetForm = useCallback(() => {
    const today = new Date();
    const in30 = new Date();
    in30.setDate(today.getDate() + 30);

    setInvoiceNumber(generateDocumentNumber(actualDocType));
    setClientId("");
    setSelectedClient(null);
    setIssueDate(formatDateForInput(today));
    setDueDate(formatDateForInput(in30));
    setStatus("draft");
    setNotes("");
    setInternalNotes("");
    setLineItems([
      { serviceId: "", name: "", description: "", quantity: "1", rate: "" },
    ]);
    sendAfterCreateRef.current = false;
  }, [actualDocType]);

  /*
    Loads the invoice data into the form when editing an existing invoice.
    This includes fetching the associated line items and client info from the database.
  */
  const loadInvoiceData = useCallback(async (invoiceData) => {
    // Set the header fields from the invoice object
    setInvoiceNumber(invoiceData.invoice_number || "");
    
    // The client_id might be at the top level OR nested inside clients object
    // depending on how the invoice was fetched (direct query vs joined query)
    const extractedClientId = invoiceData.client_id || invoiceData.clients?.id || "";
    setClientId(extractedClientId);
    
    setIssueDate(invoiceData.issue_date || "");
    setDueDate(invoiceData.due_date || "");
    setStatus(invoiceData.status || "draft");
    setNotes(invoiceData.notes || "");
    setInternalNotes(invoiceData.internal_notes || "");

    // If the invoice has client data attached (from the list query), use it
    // Otherwise we'll get the client info from the clients array once it loads
    if (invoiceData.clients) {
      setSelectedClient(invoiceData.clients);
    }

    // Now fetch the line items for this invoice from the database
    const { data: lineItemsData, error } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoiceData.id)
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching line items:", error);
      // Even if we fail to load line items, we still show the invoice with an empty line
      setLineItems([
        { serviceId: "", name: "", description: "", quantity: "1", rate: "" },
      ]);
      return;
    }

    // Transform the database line items into our form's expected format
    if (lineItemsData && lineItemsData.length > 0) {
      const formattedItems = lineItemsData.map((item) => ({
        id: item.id, // Keep track of existing item IDs for updates
        serviceId: item.service_id || "",
        name: item.name || "",
        description: item.description || "",
        quantity: String(item.quantity || "1"),
        rate: String(item.rate || ""),
      }));
      setLineItems(formattedItems);
    } else {
      // No line items found, start with a blank one
      setLineItems([
        { serviceId: "", name: "", description: "", quantity: "1", rate: "" },
      ]);
    }
  }, []);

  /*
    Main initialization effect - runs when the modal opens.
    Loads user data, clients, services, and either sets up for create mode
    or loads existing invoice data for edit mode.
  */
  useEffect(() => {
    if (!open) return;

    async function init() {
      setLoadingData(true);

      // First, verify the user is logged in
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(userError);
        showToast("You must be logged in to manage invoices.");
        setLoadingData(false);
        return;
      }

      setUser(user);

      // Fetch the user's clients - including email for the send invoice feature
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, email")
        .order("name", { ascending: true });

      if (clientsError) {
        console.error(clientsError);
      } else {
        setClients(clientsData || []);
      }

      // Fetch the user's saved services, including the description field
      // for pre-populating line item descriptions
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, default_rate, description")
        .order("name", { ascending: true });

      if (servicesError) {
        console.error(servicesError);
      } else {
        setServices(servicesData || []);
      }

      // Now set up the form - either for editing or creating
      if (isEditMode && invoice) {
        await loadInvoiceData(invoice);
        // If we have client data from the list but not full details, find the full client
        if (invoice.client_id && clientsData) {
          const fullClient = clientsData.find((c) => c.id === invoice.client_id);
          if (fullClient) {
            setSelectedClient(fullClient);
          }
        }
      } else {
        resetForm();
      }

      setLoadingData(false);
    }

    init();
  }, [open, isEditMode, invoice, loadInvoiceData, resetForm]);

  // Don't render anything if the modal isn't open
  if (!open) return null;

  /*
    Adds a new blank line item to the invoice.
    Users can have as many line items as they need.
  */
  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { serviceId: "", name: "", description: "", quantity: "1", rate: "" },
    ]);
  };

  /*
    Removes a line item from the invoice by its index.
    We don't allow removing the last line item - there should always be at least one.
  */
  const handleRemoveLineItem = (index) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  /*
    Updates a specific field on a specific line item.
    This is a generic handler that works for any field (quantity, rate, description, etc.)
  */
  const handleLineItemFieldChange = (index, field, value) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  /*
    Handles the selection of a service from the dropdown.
    This can be:
    - A custom service (NEW_SERVICE_OPTION) - user enters their own details
    - An existing service - pre-fills name, description, and rate
    - Empty/cleared selection - resets the line item fields
  */
  const handleServiceSelect = (index, selectedValue) => {
    // User selected "Custom Service" - let them type in their own details
    if (selectedValue === NEW_SERVICE_OPTION) {
      setLineItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                serviceId: NEW_SERVICE_OPTION,
                // Keep existing name/description/rate so they aren't lost
              }
            : item
        )
      );
      return;
    }

    // User cleared the selection
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

    // User selected an existing service - pre-fill the details
    const selectedService =
      services.find((s) => s.id === selectedValue) || null;

    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        return {
          ...item,
          serviceId: selectedValue,
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

  /*
    Calculates the subtotal, tax amount, and total for the invoice
    based on all the line items. This runs on every render to keep
    the totals always up to date as the user types.
  */
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

  /*
    Handles the form submission for both create and edit modes.
    Validates the input, then either inserts a new invoice or updates
    an existing one along with its line items.
  */
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

    // Filter out any empty or invalid line items
    const validLineItems = lineItems.filter((item) => {
      const hasDesc = item.description && item.description.trim() !== "";
      const hasName = item.name && item.name.trim() !== "";
      const qtyOk = parseFloat(item.quantity || "0") > 0;
      return (hasDesc || hasName) && qtyOk;
    });

    if (validLineItems.length === 0) {
      showToast("Please add at least one valid line item.", "warning");
      return;
    }

    setSaving(true);

    try {
      if (isEditMode) {
        // Update existing invoice
        await handleUpdateInvoice(validLineItems);
      } else {
        // Create new invoice/estimate
        const newInvoice = await handleCreateInvoice(validLineItems);
        
        // If "Create & Send" was clicked, send immediately after creation
        if (sendAfterCreateRef.current && newInvoice) {
          setSaving(false);
          setSending(true);
          
          try {
            const response = await fetch("/api/send-invoice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                invoiceId: newInvoice.id,
                userId: user.id,
              }),
            });

            const result = await response.json();

            if (!response.ok) {
              showToast(`Created but failed to send: ${result.error}`);
              // Still notify parent to refresh list (will show as draft)
              if (typeof onSaved === "function") {
                onSaved(newInvoice);
              }
            } else {
              // Show success message and auto-close after a brief delay
              setSuccessMessage(`${isEstimate ? "Estimate" : "Invoice"} sent to ${result.clientEmail}`);
              // Notify parent with updated status so list shows "sent"
              if (typeof onSaved === "function") {
                onSaved({ ...newInvoice, status: "sent" });
              }
              // Auto-close the modal after showing success
              setTimeout(() => {
                setSuccessMessage("");
                onClose();
              }, 2000);
            }
          } catch (sendErr) {
            console.error("Error sending:", sendErr);
            showToast(`${isEstimate ? "Estimate" : "Invoice"} created but failed to send. You can send it later.`, "warning");
            // Still notify parent to refresh list
            if (typeof onSaved === "function") {
              onSaved(newInvoice);
            }
          } finally {
            setSending(false);
            sendAfterCreateRef.current = false;
            onClose(); // Close modal after send attempt
          }
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Unexpected error saving. Please try again.");
    } finally {
      setSaving(false);
      sendAfterCreateRef.current = false;
    }
  };

  /*
    Creates a new invoice and its line items in the database.
    This is the original create logic, now extracted into its own function.
  */
  const handleCreateInvoice = async (validLineItems) => {
    // Insert the invoice/estimate header record
    const { data: newInvoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        owner_id: user.id,
        client_id: clientId,
        invoice_number: invoiceNumber || null,
        issue_date: issueDate,
        due_date: dueDate,
        status,
        notes: notes || null,
        internal_notes: internalNotes || null,
        subtotal,
        tax_rate: TAX_RATE,
        tax_amount: taxAmount,
        total,
        document_type: actualDocType, // 'estimate' or 'invoice'
      })
      .select("*")
      .single();

    if (invoiceError) {
      console.error(invoiceError);
      showToast(`Error creating invoice: ${invoiceError.message}`);
      return null;
    }

    // Now insert all the line items linked to this invoice
    const lineItemsPayload = validLineItems.map((item, index) => {
      const qty = parseFloat(item.quantity || "0");
      const rate = parseFloat(item.rate || "0");
      const lineTotal = !isNaN(qty) && !isNaN(rate) ? qty * rate : 0;

      const rawName = (item.name || "").trim();
      const rawDesc = (item.description || "").trim();

      // If the name is empty, we fall back to the description or a generic label
      const finalName =
        rawName || (rawDesc ? rawDesc.slice(0, 80) : "Line item");

      // Only save service_id if it's a real service (not custom or empty)
      const serviceIdToSave = 
        item.serviceId && item.serviceId !== NEW_SERVICE_OPTION 
          ? item.serviceId 
          : null;

      return {
        invoice_id: newInvoice.id,
        service_id: serviceIdToSave,
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
      showToast(
        `Invoice created, but there was an error saving line items: ${lineItemsError.message}`
      );
      return null;
    }

    // Only notify parent and close if we're NOT sending after create
    // (the send flow will handle this after the send completes)
    if (!sendAfterCreateRef.current) {
      if (typeof onSaved === "function") {
        onSaved(newInvoice);
      }
      onClose();
    }
    
    return newInvoice;
  };

  /*
    Shows the confirmation dialog before sending.
    Only available in edit mode since the invoice needs to exist first.
  */
  const handleSendClick = () => {
    if (!user || !invoice) {
      showToast("Please save the invoice first before sending.", "warning");
      return;
    }

    // Check if client has an email
    if (!selectedClient?.email) {
      showToast("This client doesn't have an email address. Please add one in the Clients page first.", "warning");
      return;
    }

    // Show the user-friendly confirmation dialog
    setShowSendConfirm(true);
  };

  /*
    Actually sends the invoice email to the client after confirmation.
  */
  const handleConfirmSend = async () => {
    setShowSendConfirm(false);
    setSending(true);

    try {
      const response = await fetch("/api/send-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          userId: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error || "Failed to send email.");
        setSending(false);
        return;
      }

      // Update the status locally if it was changed
      if (result.statusUpdated) {
        setStatus("sent");
      }

      // Show success message and auto-close after a brief delay
      setSuccessMessage(`${isEstimate ? "Estimate" : "Invoice"} sent to ${result.clientEmail}`);
      
      // Notify the parent that the invoice was updated (status changed to sent)
      if (typeof onSaved === "function" && result.statusUpdated) {
        onSaved({ ...invoice, status: "sent" });
      }
      
      // Auto-close the modal after showing success
      setTimeout(() => {
        setSuccessMessage("");
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error sending invoice:", err);
      showToast("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  /*
    Updates an existing invoice and its line items in the database.
    This handles the more complex case of syncing line items - some may be
    new, some may be updated, and some may have been removed.
  */
  const handleUpdateInvoice = async (validLineItems) => {
    // Update the invoice header record
    const { data: updatedInvoice, error: invoiceError } = await supabase
      .from("invoices")
      .update({
        client_id: clientId,
        invoice_number: invoiceNumber || null,
        issue_date: issueDate,
        due_date: dueDate,
        status,
        notes: notes || null,
        internal_notes: internalNotes || null,
        subtotal,
        tax_rate: TAX_RATE,
        tax_amount: taxAmount,
        total,
      })
      .eq("id", invoice.id)
      .select("*")
      .single();

    if (invoiceError) {
      console.error(invoiceError);
      showToast(`Error updating invoice: ${invoiceError.message}`);
      return;
    }

    // For line items, the simplest approach is to delete all existing ones
    // and re-insert the current list. This avoids complex diffing logic
    // and ensures the database matches exactly what the user sees.
    const { error: deleteError } = await supabase
      .from("invoice_line_items")
      .delete()
      .eq("invoice_id", invoice.id);

    if (deleteError) {
      console.error(deleteError);
      showToast(
        `Invoice updated, but there was an error updating line items: ${deleteError.message}`
      );
      return;
    }

    // Insert the updated line items
    const lineItemsPayload = validLineItems.map((item, index) => {
      const qty = parseFloat(item.quantity || "0");
      const rate = parseFloat(item.rate || "0");
      const lineTotal = !isNaN(qty) && !isNaN(rate) ? qty * rate : 0;

      const rawName = (item.name || "").trim();
      const rawDesc = (item.description || "").trim();

      const finalName =
        rawName || (rawDesc ? rawDesc.slice(0, 80) : "Line item");

      // Only save service_id if it's a real service (not custom or empty)
      const serviceIdToSave = 
        item.serviceId && item.serviceId !== NEW_SERVICE_OPTION 
          ? item.serviceId 
          : null;

      return {
        invoice_id: invoice.id,
        service_id: serviceIdToSave,
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
      showToast(
        `Invoice updated, but there was an error saving line items: ${lineItemsError.message}`
      );
      return;
    }

    // Notify the parent component that we've saved successfully
    if (typeof onSaved === "function") {
      onSaved(updatedInvoice);
    }

    onClose();
  };

  return (
    <>
      {/* Toast notification - shows error/warning/success messages */}
      <Toast 
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />
      
      {/* Send confirmation dialog - centered popup before sending */}
      <ConfirmDialog
        open={showSendConfirm}
        title="Ready to send?"
        message={`${isEstimate ? "Estimate" : "Invoice"} will be sent to:\nClient: ${selectedClient?.name || "—"}\nEmail: ${selectedClient?.email || "—"}`}
        confirmLabel="Send Now"
        cancelLabel="Cancel"
        confirmType="primary"
        onConfirm={handleConfirmSend}
        onCancel={() => setShowSendConfirm(false)}
      />
      
      <div className={styles.overlay}>
        <div className={styles.modal}>
        {/* Header - shows different title based on create vs edit mode and document type */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isEditMode 
              ? (isEstimate ? "Edit Estimate" : "Edit Invoice")
              : (isEstimate ? "Create Estimate" : "Create Invoice")
            }
          </h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1L13 13M1 13L13 1" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Success message banner - shows when email is sent */}
          {successMessage && (
            <div className={styles.successBanner}>
              <svg className={styles.successIcon} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          
          {loadingData ? (
            <div className={styles.loadingBox}>Loading...</div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              {/* Top row: Document number on left, Client dropdown on far right */}
              <div className={styles.topRow}>
                <div className={styles.topRowLeft}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      {isEstimate ? "Estimate Number" : "Invoice Number"}
                    </label>
                    {isEditMode ? (
                      <div className={styles.readonlyValue}>
                        {invoiceNumber || "—"}
                      </div>
                    ) : (
                      <div className={styles.readonlyValue}>
                        {invoiceNumber || "Generating..."}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.topRowRight}>
                  <div className={styles.field}>
                    <label className={styles.label}>Client</label>
                    <SearchableSelect
                      value={clientId}
                      onChange={(val) => {
                        setClientId(val);
                        const client = clients.find((c) => c.id === val);
                        setSelectedClient(client || null);
                      }}
                      options={clients.map((client) => ({
                        value: client.id,
                        label: client.name,
                      }))}
                      placeholder="Select a client"
                      disabled={saving || sending}
                    />
                  </div>
                </div>
              </div>

              {/* Dates and status row */}
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
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={saving || sending}
                    required
                  />
                </div>

                {/* <div className={styles.field}>
                  <label className={styles.label}>Status</label>
                  <select
                    className={styles.select}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={saving || sending}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div> */}
              </div>

              {/* Line Items Section */}
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
                      {/* Service select dropdown */}
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
                          disabled={saving || sending}
                        />
                      </div>

                      {/* Description - what appears on the final invoice */}
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
                          disabled={saving || sending}
                          required
                        />
                      </div>

                      {/* Quantity input */}
                      <div className={styles.colQty}>
                        <input
                          className={styles.input}
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleLineItemFieldChange(
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                          disabled={saving || sending}
                          required
                        />
                      </div>

                      {/* Rate input - pre-fills from service but is editable */}
                      <div className={styles.colRate}>
                        <input
                          className={styles.input}
                          type="number"
                          min="0"
                          step="1"
                          value={item.rate}
                          onChange={(e) =>
                            handleLineItemFieldChange(
                              index,
                              "rate",
                              e.target.value
                            )
                          }
                          disabled={saving || sending}
                          required
                        />
                      </div>

                      {/* Remove button - only shown if there's more than one line item */}
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

              {/* Notes and Totals Section */}
              <div className={styles.footerRow}>
                <div className={styles.notesField}>
                  <label className={styles.label}>
                    Notes (shown on invoice)
                  </label>
                  <textarea
                    className={styles.textarea}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={saving || sending}
                    placeholder="Optional notes to your customer (payment terms, thank you note, etc.)"
                  />
                  <label className={styles.label}>
                    Internal Notes (not shown on invoice)
                  </label>
                  <textarea
                    className={`${styles.textarea} ${styles.internalNotes}`}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    disabled={saving || sending}
                    placeholder="Internal notes (not shown to customer)"
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

              {/* Action Buttons */}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={onClose}
                  disabled={saving || sending}
                >
                  Cancel
                </button>

                {/* Send button - only shown in edit mode, works for both invoices and estimates */}
                {isEditMode && (
                  <button
                    type="button"
                    className={styles.sendButton}
                    onClick={handleSendClick}
                    disabled={saving || sending || !selectedClient?.email}
                    title={
                      !selectedClient?.email
                        ? "Client has no email address"
                        : isEstimate ? "Send estimate to client" : "Send invoice to client"
                    }
                  >
                    {sending ? (
                      "Sending..."
                    ) : (
                      <>
                        {/* Email/Send icon */}
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

                {/* For invoices: Show "Create Invoice" button in create mode, "Save Changes" in edit mode */}
                {/* For estimates: Only show "Create & Send" in create mode (no draft estimates) */}
                {(isEditMode || !isEstimate) && (
                  <button
                    type="submit"
                    className={styles.saveButton}
                    disabled={saving || sending}
                  >
                    {saving
                      ? isEditMode
                        ? "Saving..."
                        : "Creating..."
                      : isEditMode
                      ? "Save Changes"
                      : "Create & Save"}
                  </button>
                )}

                {/* Create & Send button - for invoices in create mode */}
                {!isEditMode && !isEstimate && (
                  <button
                    type="submit"
                    className={styles.createAndSendButton}
                    disabled={saving || sending || !selectedClient?.email}
                    onClick={() => { sendAfterCreateRef.current = true; }}
                    title={
                      !selectedClient?.email
                        ? "Select a client with an email address to send immediately"
                        : "Create and send invoice to client"
                    }
                  >
                    {sending ? "Sending..." : "Create & Send Invoice"}
                  </button>
                )}

                {/* For estimates in create mode: Only "Create & Send" button (estimates are always sent) */}
                {!isEditMode && isEstimate && (
                  <button
                    type="submit"
                    className={styles.createAndSendButton}
                    disabled={saving || sending || !selectedClient?.email}
                    onClick={() => { sendAfterCreateRef.current = true; }}
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

