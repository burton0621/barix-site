"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./createJobModal.module.css";

export default function CreateJobModal({ open, onClose, ownerId, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);

  const [title, setTitle] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("active");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!open || !ownerId) return;

    async function loadClients() {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("owner_id", ownerId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading clients:", error);
        setClients([]);
        return;
      }

      setClients(data || []);
    }

    loadClients();
  }, [open, ownerId]);

  useEffect(() => {
    if (!open) return;

    setTitle("");
    setJobNumber("");
    setClientId("");
    setStatus("active");
    setDescription("");
    setStartDate("");
    setDueDate("");
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ownerId || !title.trim() || !clientId) return;

    setSaving(true);

    const payload = {
      owner_id: ownerId,
      client_id: clientId,
      title: title.trim(),
      job_number: jobNumber.trim() || null,
      status,
      description: description.trim() || null,
      start_date: startDate || null,
      due_date: dueDate || null,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("jobs")
      .insert([payload])
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      console.error("Error creating job:", error);
      return;
    }

    if (onCreated) onCreated(data);
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Create Job</h2>
            <p className={styles.subtitle}>
              Create a job to group invoices, estimates, notes, and photos.
            </p>
          </div>

          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>Job Title</label>
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kitchen Remodel"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Job Number</label>
              <input
                className={styles.input}
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                placeholder="JOB-1001"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Client</label>
              <select
                className={styles.input}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name || "Unnamed Client"}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Status</label>
              <select
                className={styles.input}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Start Date</label>
              <input
                type="date"
                className={styles.input}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Due Date</label>
              <input
                type="date"
                className={styles.input}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional job description..."
                rows={5}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? "Creating..." : "Create Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getClientDisplayName(client) {
  if (!client) return "Unknown Client";

  if (client.client_type === "company") {
    return client.company_name || "Unnamed Company";
  }

  const fullName = `${client.first_name || ""} ${client.last_name || ""}`.trim();
  return fullName || client.company_name || "Unnamed Client";
}