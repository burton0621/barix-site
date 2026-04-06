"use client";

import { isSameDay, formatTime } from "@/lib/utils/dateHelpers";
import styles from "./DayPanel.module.css";

const TYPE_CONFIG = {
  client_meeting: { color: "#0a2540", label: "Client Meeting" },
  job_site_visit: { color: "#16a34a", label: "Job Site Visit" },
  general:        { color: "#9bbcd5", label: "General" },
  invoice_due:    { color: "#d97706", label: "Invoice Due" },
};

const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatDayHeader(day) {
  return `${WEEKDAYS[day.getDay()]}, ${MONTHS[day.getMonth()]} ${day.getDate()}`;
}

function formatTime12(isoString) {
  const d = new Date(isoString);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return m === 0 ? `${h} ${ampm}` : `${h}:${String(m).padStart(2,"0")} ${ampm}`;
}

function getSubtitle(appt) {
  if (appt.clients?.name) return appt.clients.name;
  if (appt.location) return appt.location;
  return null;
}

export default function DayPanel({ day, appointments, onClose, onAddAppointment, onAppointmentClick }) {
  const dayAppts = appointments
    .filter((a) => isSameDay(new Date(a.start_time), day))
    .sort((a, b) => {
      if (a.all_day && !b.all_day) return -1;
      if (!a.all_day && b.all_day) return 1;
      return new Date(a.start_time) - new Date(b.start_time);
    });

  return (
    <div className={styles.panel}>
      {/* Panel header */}
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelWeekday}>{WEEKDAYS[day.getDay()]}</p>
          <p className={styles.panelDate}>
            {MONTHS[day.getMonth()]} {day.getDate()}
          </p>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close panel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Appointment count badge */}
      <div className={styles.countRow}>
        <span className={styles.countBadge}>
          {dayAppts.length === 0
            ? "No appointments"
            : dayAppts.length === 1
            ? "1 appointment"
            : `${dayAppts.length} appointments`}
        </span>
      </div>

      {/* Appointment list */}
      <div className={styles.list}>
        {dayAppts.length === 0 ? (
          <div className={styles.empty}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className={styles.emptyText}>Nothing scheduled</p>
            <p className={styles.emptyHint}>Tap below to add an appointment</p>
          </div>
        ) : (
          dayAppts.map((appt) => {
            const cfg = TYPE_CONFIG[appt.type] || TYPE_CONFIG.general;
            const subtitle = getSubtitle(appt);
            return (
              <button
                key={appt.id}
                className={styles.apptRow}
                onClick={() => onAppointmentClick(appt)}
              >
                <div className={styles.apptAccent} style={{ background: cfg.color }} />
                <div className={styles.apptBody}>
                  <p className={styles.apptTitle}>{appt.title}</p>
                  <p className={styles.apptMeta}>
                    {appt.all_day
                      ? "All day"
                      : `${formatTime12(appt.start_time)} – ${formatTime12(appt.end_time)}`}
                  </p>
                  {subtitle && <p className={styles.apptSub}>{subtitle}</p>}
                </div>
                <svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            );
          })
        )}
      </div>

    </div>
  );
}
