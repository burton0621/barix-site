"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ConfirmDialog from "../common/ConfirmDialog/ConfirmDialog";
import Toast from "../common/Toast/Toast";
import styles from "./AddServiceModal.module.css";

export default function AddServiceModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
  service = null, // when present -> edit mode
}) {
  const isEdit = !!service?.id;

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [defaultRate, setDefaultRate] = useState("");
  const [description, setDescription] = useState("");

  // confirm dialog state
  const [confirmAction, setConfirmAction] = useState(null); // null | "update" | "delete"
  
  // Toast notification state for user-friendly feedback
  const [toast, setToast] = useState({ open: false, message: "", type: "error" });
  
  // Helper to show toast notifications
  const showToast = (message, type = "error") => {
    setToast({ open: true, message, type });
  };

  // Reset/prefill fields every time modal opens or service changes
  useEffect(() => {
    if (!open) return;

    setSaving(false);
    setDeleting(false);
    setConfirmAction(null);

    if (service) {
      setName(service.name || "");
      setDefaultRate(
        service.default_rate === null || service.default_rate === undefined
          ? ""
          : String(service.default_rate)
      );
      setDescription(service.description || "");
    } else {
      setName("");
      setDefaultRate("");
      setDescription("");
    }
  }, [open, service]);

  if (!open) return null;

  const requireUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    const user = data?.user;
    if (error || !user) {
      console.error("getUser error:", error);
      showToast("You must be logged in to manage services.");
      return null;
    }
    return user;
  };

  const buildPayload = () => {
    const rateValue = parseFloat(defaultRate || "0");
    return {
      name: name.trim(),
      default_rate: Number.isFinite(rateValue) ? rateValue : 0,
      description: description.trim() || null,
    };
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast("Please enter a service name.", "warning");
      return;
    }

    setSaving(true);
    try {
      const user = await requireUser();
      if (!user) return;

      const payload = buildPayload();

      const { data: createdService, error } = await supabase
        .from("services")
        .insert({
          owner_id: user.id,
          ...payload,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Insert error:", error);
        showToast(`Error saving service: ${error.message}`);
        return;
      }

      onCreated?.(createdService);
      onClose();
    } catch (err) {
      console.error("Unexpected error creating service:", err);
      showToast(
        `Unexpected error creating service: ${
          err?.message ? err.message : String(err)
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateConfirm = async () => {
    if (!isEdit) return;

    if (!name.trim()) {
      showToast("Please enter a service name.", "warning");
      return;
    }

    setSaving(true);
    try {
      const user = await requireUser();
      if (!user) return;

      const payload = buildPayload();

      const { data: updatedService, error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", service.id)
        .eq("owner_id", user.id)
        .select("*")
        .single();

      if (error) {
        console.error("Update error:", error);
        showToast(`Error updating service: ${error.message}`);
        return;
      }

      onUpdated?.(updatedService);
      onClose();
    } catch (err) {
      console.error("Unexpected error updating service:", err);
      showToast(
        `Unexpected error updating service: ${
          err?.message ? err.message : String(err)
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!isEdit) return;

    setDeleting(true);
    try {
      const user = await requireUser();
      if (!user) return;

      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", service.id)
        .eq("owner_id", user.id);

      if (error) {
        console.error("Delete error:", error);
        showToast(`Error deleting service: ${error.message}`);
        return;
      }

      onDeleted?.(service.id);
      onClose();
    } catch (err) {
      console.error("Unexpected error deleting service:", err);
      showToast(
        `Unexpected error deleting service: ${
          err?.message ? err.message : String(err)
        }`
      );
    } finally {
      setDeleting(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();

    if (!isEdit) {
      // Create = no confirm
      handleCreate();
      return;
    }

    // Edit = confirm first
    setConfirmAction("update");
  };

  return (
    <>
      {/* Toast notification for user-friendly feedback */}
      <Toast 
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />
      
      <div className={styles.overlay}>
        <div className={styles.modal}>
          {/* HEADER */}
          <div className={styles.header}>
            <h2 className={styles.title}>
              {isEdit ? "Edit Service" : "Add New Service"}
            </h2>
            <button
              className={styles.closeButton}
              onClick={onClose}
            disabled={saving || deleting}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Service Name</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. Drain Cleaning, Water Heater Install..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving || deleting}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Rate (optional)</label>
            <input
              className={styles.input}
              type="number"
              placeholder="125.00"
              min="0"
              step="0.01"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
              disabled={saving || deleting}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description (optional)</label>
            <textarea
              className={styles.textarea}
              placeholder="Description shown on invoices..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving || deleting}
            />
          </div>

          <div className={styles.actions}>
            {isEdit ? (
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => setConfirmAction("delete")}
                disabled={saving || deleting}
              >
                Delete
              </button>
            ) : (
              <span />
            )}

            <div className={styles.rightActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={saving || deleting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={styles.saveButton}
                disabled={saving || deleting}
              >
                {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Service"}
              </button>
            </div>
          </div>
        </form>

        {/* Confirm dialogs */}
        {confirmAction === "update" && (
          <ConfirmDialog
            open={true}
            title="Confirm Update"
            message="Are you sure you want to update this service?"
            confirmLabel="Yes, Update"
            confirmType="primary"
            onConfirm={() => {
              setConfirmAction(null);
              handleUpdateConfirm();
            }}
            onCancel={() => setConfirmAction(null)}
          />
        )}

        {confirmAction === "delete" && (
          <ConfirmDialog
            open={true}
            title="Delete Service"
            message="Are you sure you want to delete this service? This action cannot be undone."
            confirmLabel="Yes, Delete"
            confirmType="danger"
            onConfirm={() => {
              setConfirmAction(null);
              handleDeleteConfirm();
            }}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </div>
    </div>
    </>
  );
}
