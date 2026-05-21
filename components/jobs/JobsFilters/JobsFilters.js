"use client";

import styles from "./jobsFilters.module.css";

export default function JobsFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}) {
  return (
    <section className={styles.wrap}>
      <div className={styles.searchWrap}>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search jobs, clients, numbers..."
          className={styles.searchInput}
        />
      </div>

      <div className={styles.selectWrap}>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className={styles.select}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On hold</option>
        </select>
      </div>
    </section>
  );
}