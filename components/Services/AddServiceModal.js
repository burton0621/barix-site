"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./AddServiceModal.module.css";

export default function AddServiceModal({ open, onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [defaultRate, setDefaultRate] = useState("");
  const [description, setDescription] = useState("");

  // Reset fields every time modal opens
  useEffect(() => {
    if (open) {
      setName("");
      setDefaultRate("");
      setDescription("");
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter a service name.");
      return;
    }

    setSaving(true);

    try {
      // Safer auth retrieval (prevents destructuring crashes)
      const { data, error: userError } = await supabase.auth.getUser();
      const user = data?.user;

      if (userError || !user) {
        console.error("getUser error:", userError);
        alert("You must be logged in to add a service.");
        return;
      }

      const rateValue = parseFloat(defaultRate || "0");

      // Insert and return the created row so the parent page can update instantly
      const { data: createdService, error } = await supabase
        .from("services")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          default_rate: Number.isFinite(rateValue) ? rateValue : 0,
          description: description.trim() || null,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Insert error:", error);
        alert(`Error saving service. ${error.message}`);
        return;
      }

      // Notify parent and close modal
      onCreated?.(createdService);
      onClose();
    } catch (err) {
      console.error("Unexpected error creating service:", err);
      alert(
        `Unexpected error creating service: ${
          err?.message ? err.message : String(err)
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* HEADER */}
        <div className={styles.header}>
          <h2 className={styles.title}>Add New Service</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Service Name</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. Drain Cleaning, Water Heater Install..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
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
              disabled={saving}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description (optional)</label>
            <textarea
              className={styles.textarea}
              placeholder="Description shown on invoices..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button type="submit" className={styles.saveButton} disabled={saving}>
              {saving ? "Saving..." : "Save Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
