"use client";

import { useState, useEffect } from "react";
import { isSameDay, formatTime, DAY_NAMES } from "@/lib/utils/dateHelpers";
import styles from "./WeekView.module.css";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const VISIBLE_START = 7;
const VISIBLE_END = 20;
const HOUR_HEIGHT = 64;

const TYPE_COLORS = {
  client_meeting: { bg: "#eef3f8", border: "#0a2540", text: "#0a2540" },
  job_site_visit: { bg: "#f0fdf4", border: "#16a34a", text: "#15803d" },
  general:        { bg: "#f5f8fa", border: "#9bbcd5", text: "#133a5d" },
  invoice_due:    { bg: "#fffbeb", border: "#d97706", text: "#92400e" },
};

function getAppointmentsForDay(appointments, day) {
  return appointments.filter((a) => isSameDay(new Date(a.start_time), day));
}

function positionInDay(appointment) {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const rawEndMinutes = end.getHours() * 60 + end.getMinutes();
  const endMinutes = Math.min(rawEndMinutes, VISIBLE_END * 60);
  const durationMinutes = Math.max(endMinutes - startMinutes, 30);
  const top = ((startMinutes - VISIBLE_START * 60) / 60) * HOUR_HEIGHT;
  const height = (durationMinutes / 60) * HOUR_HEIGHT;
  return { top, height };
}

// Assigns left/width % to each appointment so overlapping events tile side-by-side.
function computeOverlapLayout(appts) {
  const layout = new Map(); // id -> { left, width }
  if (!appts.length) return layout;

  const sorted = [...appts]
    .filter((a) => !a.all_day)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  // Assign each event a column index (greedy, uses first free column)
  const colEnds = []; // tracks end time of last event in each column
  const colMap = new Map(); // id -> col index

  for (const appt of sorted) {
    const startMs = new Date(appt.start_time).getTime();
    const endMs = Math.max(new Date(appt.end_time).getTime(), startMs + 30 * 60000);
    let col = colEnds.findIndex((end) => end <= startMs);
    if (col === -1) { col = colEnds.length; colEnds.push(endMs); }
    else colEnds[col] = endMs;
    colMap.set(appt.id, col);
  }

  // For each event, count how many columns are occupied by its overlap group
  for (const appt of sorted) {
    const aStart = new Date(appt.start_time).getTime();
    const aEnd = Math.max(new Date(appt.end_time).getTime(), aStart + 30 * 60000);
    let maxCol = colMap.get(appt.id);
    for (const other of sorted) {
      if (other.id === appt.id) continue;
      const bStart = new Date(other.start_time).getTime();
      const bEnd = Math.max(new Date(other.end_time).getTime(), bStart + 30 * 60000);
      if (aStart < bEnd && aEnd > bStart) {
        maxCol = Math.max(maxCol, colMap.get(other.id));
      }
    }
    const numCols = maxCol + 1;
    const col = colMap.get(appt.id);
    const GAP = 2; // px gap between columns, expressed as % isn't practical so we use offset
    layout.set(appt.id, {
      left: `calc(${(col / numCols) * 100}% + ${GAP}px)`,
      width: `calc(${(1 / numCols) * 100}% - ${GAP * 2}px)`,
    });
  }

  return layout;
}

function getCurrentTimeTop() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return ((minutes - VISIBLE_START * 60) / 60) * HOUR_HEIGHT;
}

export default function WeekView({ days, appointments, onSlotClick, onAppointmentClick }) {
  const today = new Date();
  const [timeTop, setTimeTop] = useState(getCurrentTimeTop());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTop(getCurrentTimeTop());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const isCurrentWeek = days.some((d) => isSameDay(d, today));
  const showTimeLine = isCurrentWeek && timeTop >= 0 && timeTop <= (VISIBLE_END - VISIBLE_START) * HOUR_HEIGHT;
  const todayColIndex = days.findIndex((d) => isSameDay(d, today));

  return (
    <div className={styles.container}>
      {/* Day header row */}
      <div className={styles.headerRow}>
        <div className={styles.gutterCell} />
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ""}`}
            >
              <span className={styles.dayName}>{DAY_NAMES[days.indexOf(day)]}</span>
              <span className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : ""}`}>
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className={styles.gridScroll}>
        <div
          className={styles.grid}
          style={{ height: `${(VISIBLE_END - VISIBLE_START) * HOUR_HEIGHT}px` }}
        >
          {/* Hour labels */}
          <div className={styles.gutterCol}>
            {HOURS.slice(VISIBLE_START, VISIBLE_END).map((hour) => (
              <div key={hour} className={styles.hourLabel} style={{ height: `${HOUR_HEIGHT}px` }}>
                <span className={styles.hourText}>
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, colIndex) => {
            const isToday = isSameDay(day, today);
            const dayAppointments = getAppointmentsForDay(appointments, day);

            return (
              <div
                key={day.toISOString()}
                className={`${styles.dayCol} ${isToday ? styles.dayColToday : ""}`}
              >
                {/* Hour slots (clickable) */}
                {HOURS.slice(VISIBLE_START, VISIBLE_END).map((hour) => (
                  <div
                    key={hour}
                    className={styles.timeSlot}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    onClick={() => onSlotClick({ date: day, hour })}
                  />
                ))}

                {/* Current time indicator */}
                {showTimeLine && colIndex === todayColIndex && (
                  <div className={styles.currentTime} style={{ top: `${timeTop}px` }}>
                    <div className={styles.currentTimeDot} />
                  </div>
                )}

                {/* Appointment blocks */}
                {(() => {
                  const overlapLayout = computeOverlapLayout(dayAppointments);
                  return dayAppointments.map((appt) => {
                    if (appt.all_day) return null;
                    const { top, height } = positionInDay(appt);
                    const colors = TYPE_COLORS[appt.type] || TYPE_COLORS.general;
                    const ol = overlapLayout.get(appt.id) || { left: "2px", width: "calc(100% - 4px)" };

                    return (
                      <div
                        key={appt.id}
                        className={styles.apptBlock}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: ol.left,
                          width: ol.width,
                          background: colors.bg,
                          borderLeft: `3px solid ${colors.border}`,
                          color: colors.text,
                        }}
                        onClick={(e) => { e.stopPropagation(); onAppointmentClick(appt); }}
                      >
                        <span className={styles.apptTitle}>{appt.title}</span>
                        {height > 36 && (
                          <span className={styles.apptTime}>
                            {formatTime(appt.start_time)}
                          </span>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        {appointments.some((a) => a.all_day) && (
          <div className={styles.allDayRow}>
            <div className={styles.gutterCell} />
            {days.map((day) => {
              const allDayAppts = getAppointmentsForDay(appointments, day).filter((a) => a.all_day);
              return (
                <div key={day.toISOString()} className={styles.allDayCell}>
                  {allDayAppts.map((appt) => {
                    const colors = TYPE_COLORS[appt.type] || TYPE_COLORS.general;
                    return (
                      <div
                        key={appt.id}
                        className={styles.allDayChip}
                        style={{ background: colors.bg, borderLeft: `3px solid ${colors.border}`, color: colors.text }}
                        onClick={() => onAppointmentClick(appt)}
                      >
                        {appt.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
