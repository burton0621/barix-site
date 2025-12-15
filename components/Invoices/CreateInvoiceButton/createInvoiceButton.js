//Reusable create invoice button component

"use client";

import { useState } from "react";
import CreateInvoiceModal from "../CreateInvoice/CreateInvoiceModal";
import styles from "./createInvoiceButton.module.css";

export default function CreateInvoiceButton({
  onCreated,
  buttonText = "Create invoice",
  className = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleCreated(invoice) {
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

      <CreateInvoiceModal
        open={open}          // change to isOpen if needed
        onClose={handleClose}
        onCreated={handleCreated}
      />
    </>
  );
}
