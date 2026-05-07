"use client";

import { useState, useEffect } from "react";
import styles from "./AppointmentModal.module.css";

const TYPE_OPTIONS = [
  { value: "general", label: "General Event" },
  { value: "client_meeting", label: "Client Meeting" },
  { value: "job_site_visit", label: "Job Site Visit" },
];

function toLocalDateTimeValue(isoString) {
  if (!isoString) return "";
  // Convert UTC ISO string to local datetime-local input value
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toLocalDateValue(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function AppointmentModal({
  open,
  appointment,
  defaultDate,
  defaultHour,
  clients,
  session,
  onSaved,
  onDeleted,
  onClose,
}) {
  const isEdit = Boolean(appointment?.id);

  const [type, setType] = useState("general");
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (appointment) {
      setType(appointment.type || "general");
      setTitle(appointment.title || "");
      setClientId(appointment.client_id || appointment.clients?.id || "");
      setLocation(appointment.location || "");
      setAllDay(appointment.all_day || false);
      setStartDateTime(toLocalDateTimeValue(appointment.start_time));
      setEndDateTime(toLocalDateTimeValue(appointment.end_time));
      setDate(toLocalDateValue(appointment.start_time));
      setDescription(appointment.description || "");
    } else {
      // New appointment — pre-fill from defaults
      setType("general");
      setTitle("");
      setClientId("");
      setLocation("");
      setAllDay(false);
      setDescription("");
      setError("");

      if (defaultDate) {
        const pad = (n) => String(n).padStart(2, "0");
        const d = new Date(defaultDate);
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const hour = defaultHour ?? 9;
        setDate(dateStr);
        setStartDateTime(`${dateStr}T${pad(hour)}:00`);
        setEndDateTime(`${dateStr}T${pad(hour + 1)}:00`);
      } else {
        setDate("");
        setStartDateTime("");
        setEndDateTime("");
      }
    }
    setError("");
  }, [open, appointment, defaultDate, defaultHour]);

  if (!open) return null;

  async function handleSave(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const body = {
      title: title.trim(),
      type,
      description: description.trim() || null,
      client_id: type === "client_meeting" ? clientId || null : null,
      location: type === "job_site_visit" ? location.trim() || null : null,
      all_day: allDay,
    };

    if (allDay) {
      if (!date) { setError("Date is required."); return; }
      body.start_time = new Date(date + "T00:00:00").toISOString();
      body.end_time = new Date(date + "T23:59:00").toISOString();
    } else {
      if (!startDateTime || !endDateTime) { setError("Start and end time are required."); return; }
      body.start_time = new Date(startDateTime).toISOString();
      body.end_time = new Date(endDateTime).toISOString();
      if (body.end_time <= body.start_time) {
        setError("End time must be after start time.");
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      const url = isEdit
        ? `/api/calendar/appointments/${appointment.id}`
        : "/api/calendar/appointments";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save appointment.");
        return;
      }

      onSaved(json.data);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this appointment? This cannot be undone.")) return;
    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/calendar/appointments/${appointment.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to delete appointment.");
        return;
      }

      onDeleted(appointment.id);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>
              {isEdit ? "Edit Appointment" : "New Appointment"}
            </h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSave}>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.field}>
            <label className={styles.label}>Title *</label>
            <input
              className={styles.input}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Site visit at 123 Main St"
              maxLength={200}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Type</label>
            <select
              className={styles.select}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {type === "client_meeting" && (
            <div className={styles.field}>
              <label className={styles.label}>Client</label>
              <select
                className={styles.select}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">— Select client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {type === "job_site_visit" && (
            <div className={styles.field}>
              <label className={styles.label}>Location</label>
              <input
                className={styles.input}
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="123 Main St, City, State"
              />
            </div>
          )}

          <div className={styles.allDayRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
              />
              All day
            </label>
          </div>

          {allDay ? (
            <div className={styles.field}>
              <label className={styles.label}>Date *</label>
              <input
                className={styles.input}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          ) : (
            <div className={styles.timeRow}>
              <div className={styles.field}>
                <label className={styles.label}>Start *</label>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>End *</label>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Notes</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
            />
          </div>

          <div className={styles.buttonRow}>
            {isEdit && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <div className={styles.buttonRight}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className={styles.saveBtn} disabled={saving}>
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Appointment"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
