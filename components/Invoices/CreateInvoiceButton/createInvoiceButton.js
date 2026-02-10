/*
  Create Invoice/Estimate Button
  ------------------------------
  A reusable button component that opens the InvoiceModal for creating new invoices or estimates.
  Pass documentType="estimate" for estimates, or "invoice" (default) for invoices.
*/

"use client";

import { useState } from "react";
import InvoiceModal from "../InvoiceModal/invoiceModal";
import styles from "./createInvoiceButton.module.css";

export default function CreateInvoiceButton({
  onCreated,
  buttonText = "Create invoice",
  className = "",
  disabled = false,
  documentType = "invoice", // "invoice" or "estimate"
}) {
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  // Called when the invoice/estimate is successfully created
  function handleSaved(invoice) {
    if (onCreated) onCreated(invoice);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`${styles.button} ${className}`}
      >
        {buttonText}
      </button>

      {/* 
        Using the unified InvoiceModal component.
        Pass documentType to create either an estimate or invoice.
      */}
      <InvoiceModal
        open={open}
        onClose={handleClose}
        onSaved={handleSaved}
        documentType={documentType}
      />
    </>
  );
}
