"use client";

import styles from "./ConfirmDialog.module.css";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmType = "primary", // "primary" | "danger"
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div
        className={styles.box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h4 id="confirm-title" className={styles.title}>
          {title}
        </h4>
        <p className={styles.message}>{message}</p>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              confirmType === "danger"
                ? styles.dangerButton
                : styles.primaryButton
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
