"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./devviewHome.module.css";

export default function DevViewHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    invoices: 0,
    clients: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      // NOTE: Replace these table names with your real ones.
      // This is intentionally simple so it won’t break your app if some tables differ.

      const usersQ = supabase.from("profiles").select("id", { count: "exact", head: true });
      const invoicesQ = supabase.from("invoices").select("id", { count: "exact", head: true });
      const clientsQ = supabase.from("clients").select("id", { count: "exact", head: true });

      const [u, i, c] = await Promise.all([usersQ, invoicesQ, clientsQ]);

      if (!mounted) return;

      setStats({
        users: u.count || 0,
        invoices: i.count || 0,
        clients: c.count || 0,
      });

      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>DevView Overview</h1>
        <p className={styles.subtitle}>
          Internal insights across all accounts (admins only).
        </p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.label}>Total users</div>
          <div className={styles.value}>{loading ? "…" : stats.users}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.label}>Total invoices</div>
          <div className={styles.value}>{loading ? "…" : stats.invoices}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.label}>Total clients</div>
          <div className={styles.value}>{loading ? "…" : stats.clients}</div>
        </div>
      </div>
    </div>
  );
}