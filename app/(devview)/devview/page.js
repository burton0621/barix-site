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

      const usersQ = supabase
        .from("user_directory")
        .select("user_id", { count: "exact", head: true });

      const invoicesQ = supabase
        .from("invoices")
        .select("id", { count: "exact", head: true });

      const clientsQ = supabase
        .from("clients")
        .select("id", { count: "exact", head: true });

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
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.title}>DevView Overview</h1>
              <p className={styles.subtitle}>
                Internal platform insights across all user accounts.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total users</div>
            <div className={styles.statValue}>{loading ? "…" : stats.users}</div>
            <div className={styles.statHelp}>Count from user_directory</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total invoices</div>
            <div className={styles.statValue}>{loading ? "…" : stats.invoices}</div>
            <div className={styles.statHelp}>All invoices across the platform</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total clients</div>
            <div className={styles.statValue}>{loading ? "…" : stats.clients}</div>
            <div className={styles.statHelp}>All clients added by all users</div>
          </div>
        </div>
      </div>
    </div>
  );
}