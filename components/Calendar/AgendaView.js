"use client";

import { isSameDay, isSameMonth, formatTime, DAY_NAMES } from "@/lib/utils/dateHelpers";
import styles from "./AgendaView.module.css";

const TYPE_COLORS = {
  client_meeting: { dot: "#0a2540", label: "Client Meeting" },
  job_site_visit: { dot: "#16a34a", label: "Job Site Visit" },
  general:        { dot: "#9bbcd5", label: "General" },
  invoice_due:    { dot: "#d97706", label: "Invoice Due" },
};

const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatAgendaDate(day) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `${days[day.getDay()]}, ${MONTH_NAMES[day.getMonth()]} ${day.getDate()}`;
}

function formatEventTime(appt) {
  if (appt.all_day) return "All day";
  const start = formatTime(appt.start_time);
  const end = formatTime(appt.end_time);
  return `${start} – ${end}`;
}

function getSubtitle(appt) {
  if (appt.clients?.name) return appt.clients.name;
  if (appt.location) return appt.location;
  return TYPE_COLORS[appt.type]?.label || "";
}

export default function AgendaView({
  calendarDays,
  appointments,
  currentMonth,
  selectedDay,
  onDaySelect,
  onSlotClick,
  onAppointmentClick,
}) {
  const today = new Date();

  const dayAppointments = appointments
    .filter((a) => isSameDay(new Date(a.start_time), selectedDay))
    .sort((a, b) => {
      if (a.all_day && !b.all_day) return -1;
      if (!a.all_day && b.all_day) return 1;
      return new Date(a.start_time) - new Date(b.start_time);
    });

  return (
    <div className={styles.container}>
      {/* Mini month calendar */}
      <div className={styles.miniCal}>
        <div className={styles.dayNamesRow}>
          {DAY_ABBR.map((d) => (
            <div key={d} className={styles.dayNameCell}>{d}</div>
          ))}
        </div>
        <div className={styles.calGrid}>
          {calendarDays.map((day) => {
            const inMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDay);
            const hasEvents = appointments.some((a) => isSameDay(new Date(a.start_time), day));

            return (
              <button
                key={day.toISOString()}
                className={[
                  styles.dayBtn,
                  !inMonth ? styles.dayBtnOutside : "",
                  isToday && !isSelected ? styles.dayBtnToday : "",
                  isSelected ? styles.dayBtnSelected : "",
                ].join(" ")}
                onClick={() => onDaySelect(day)}
                aria-label={day.toDateString()}
              >
                {day.getDate()}
                {hasEvents && !isSelected && (
                  <span className={styles.dotIndicator} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Day agenda */}
      <div className={styles.agenda}>
        <div className={styles.agendaHeader}>
          {formatAgendaDate(selectedDay)}
        </div>

        {dayAppointments.length === 0 ? (
          <div className={styles.empty}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c1d5e4" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p>No appointments scheduled</p>
            <button
              className={styles.emptyAddBtn}
              onClick={() => onSlotClick({ date: selectedDay })}
            >
              + Add one
            </button>
          </div>
        ) : (
          <div className={styles.eventList}>
            {dayAppointments.map((appt) => {
              const color = TYPE_COLORS[appt.type]?.dot || "#9bbcd5";
              const subtitle = getSubtitle(appt);
              return (
                <button
                  key={appt.id}
                  className={styles.eventRow}
                  onClick={() => onAppointmentClick(appt)}
                >
                  <span className={styles.eventDot} style={{ background: color }} />
                  <div className={styles.eventBody}>
                    <div className={styles.eventTime}>{formatEventTime(appt)}</div>
                    <div className={styles.eventTitle}>{appt.title}</div>
                    {subtitle && <div className={styles.eventSub}>{subtitle}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          className={styles.addBtn}
          onClick={() => onSlotClick({ date: selectedDay })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add appointment
        </button>
      </div>
    </div>
  );
}
