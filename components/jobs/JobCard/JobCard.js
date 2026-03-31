"use client";

import styles from "./jobCard.module.css";

export default function JobCard({ job, onOpen }) {
  const clientName = getClientDisplayName(job.client);

  return (
    <article className={styles.card}>
      <div className={styles.left}>
        <div className={styles.topRow}>
          <h2 className={styles.jobTitle}>{job.title || "Untitled Job"}</h2>
          <span className={`${styles.statusBadge} ${statusClass(job.status)}`}>
            {formatStatus(job.status)}
          </span>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>{clientName}</span>
          {job.job_number ? <span className={styles.metaItem}>#{job.job_number}</span> : null}
          <span className={styles.metaItem}>
            Updated {formatDateTime(job.last_activity_at || job.updated_at || job.created_at)}
          </span>
        </div>
      </div>

      <div className={styles.middle}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Estimates</span>
          <span className={styles.statValue}>{job.estimateCount || 0}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Invoices</span>
          <span className={styles.statValue}>{job.invoiceCount || 0}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Photos</span>
          <span className={styles.statValue}>{job.photoCount || 0}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Notes</span>
          <span className={styles.statValue}>{job.noteCount || 0}</span>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.totalWrap}>
          <span className={styles.totalLabel}>Total</span>
          <span className={styles.totalValue}>{formatCurrency(job.dedupedTotal || 0)}</span>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={onOpen}>
            View Job
          </button>
        </div>
      </div>
    </article>
  );
}

function getClientDisplayName(client) {
  return client?.name || "Unknown Client";
}

function formatStatus(status) {
  if (!status) return "Active";
  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status) {
  const value = String(status || "active").toLowerCase();

  if (value === "completed") return styles.completed;
  if (value === "pending") return styles.pending;
  if (value === "on_hold") return styles.onHold;
  return styles.active;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}