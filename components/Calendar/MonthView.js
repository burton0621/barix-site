"use client";

import { isSameDay, isSameMonth } from "@/lib/utils/dateHelpers";
import styles from "./MonthView.module.css";

const TYPE_DOT = {
  client_meeting: "#0a2540",
  job_site_visit: "#16a34a",
  general:        "#9bbcd5",
  invoice_due:    "#d97706",
};

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthView({
  calendarDays,
  appointments,
  currentMonth,
  panelDay,
  onDayClick,
}) {
  const today = new Date();

  return (
    <div className={styles.container}>
      {/* Day name headers */}
      <div className={styles.headerRow}>
        {DAY_HEADERS.map((name) => (
          <div key={name} className={styles.headerCell}>{name}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className={styles.grid}>
        {calendarDays.map((day) => {
          const inMonth   = isSameMonth(day, currentMonth);
          const isToday   = isSameDay(day, today);
          const isSelected = panelDay && isSameDay(day, panelDay);
          const dayAppts  = appointments.filter((a) => isSameDay(new Date(a.start_time), day));

          // Collect unique dot colors (max 3)
          const dotColors = [];
          const seen = new Set();
          for (const appt of dayAppts) {
            const color = TYPE_DOT[appt.type] || TYPE_DOT.general;
            if (!seen.has(color)) {
              seen.add(color);
              dotColors.push(color);
            }
            if (dotColors.length === 3) break;
          }
          const extra = dayAppts.length - dotColors.length;

          return (
            <button
              key={day.toISOString()}
              className={[
                styles.dayCell,
                !inMonth    ? styles.dayCellOutside  : "",
                isToday     ? styles.dayCellToday    : "",
                isSelected  ? styles.dayCellSelected : "",
              ].join(" ")}
              onClick={() => onDayClick(day)}
              aria-label={day.toDateString()}
            >
              <span className={[
                styles.dayNumber,
                isToday    ? styles.dayNumberToday    : "",
                isSelected ? styles.dayNumberSelected : "",
                !inMonth   ? styles.dayNumberOutside  : "",
              ].join(" ")}>
                {day.getDate()}
              </span>

              {/* Appointment dots */}
              {dayAppts.length > 0 && (
                <div className={styles.dots}>
                  {dotColors.map((color, i) => (
                    <span
                      key={i}
                      className={styles.dot}
                      style={{ background: color }}
                    />
                  ))}
                  {extra > 0 && (
                    <span className={styles.dotExtra}>+{extra}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
