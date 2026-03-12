"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./devviewUsers.module.css";

export default function DevViewUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      setLoading(true);

      const { data, error } = await supabase
        .from("user_directory")
        .select("user_id, email, created_at, disabled")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!mounted) return;

      if (error) {
        console.error(error);
        setErrorMsg(error.message);
        setUsers([]);
      } else {
        setUsers(data || []);
      }

      setLoading(false);
    }

    loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;

    return users.filter((u) => {
      return (
        (u.email || "").toLowerCase().includes(s) ||
        (u.user_id || "").toLowerCase().includes(s) ||
        (u.disabled ? "disabled" : "active").includes(s)
      );
    });
  }, [q, users]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => !u.disabled).length;
    return {
      total,
      active,
      disabled: total - active,
    };
  }, [users]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Users</h1>
            <p className={styles.subtitle}>
              Search across all registered accounts.
            </p>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span>Total</span>
              <strong>{stats.total}</strong>
            </div>

            <div className={styles.stat}>
              <span>Active</span>
              <strong>{stats.active}</strong>
            </div>

            <div className={styles.stat}>
              <span>Disabled</span>
              <strong>{stats.disabled}</strong>
            </div>
          </div>
        </div>

        <input
          className={styles.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, user id, status…"
        />
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.empty}>Loading users…</div>
        ) : errorMsg ? (
          <div className={styles.error}>{errorMsg}</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>No users found.</div>
        ) : (
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.head}`}>
              <div>Email</div>
              <div>Status</div>
              <div>Created</div>
              <div>User ID</div>
            </div>

            {filtered.map((u) => (
              <div className={styles.row} key={u.user_id}>
                <div className={styles.strong}>{u.email || "—"}</div>

                <div>
                  <span
                    className={`${styles.status} ${
                      u.disabled
                        ? styles.statusDisabled
                        : styles.statusActive
                    }`}
                  >
                    {u.disabled ? "Disabled" : "Active"}
                  </span>
                </div>

                <div>
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString()
                    : "—"}
                </div>

                <div className={styles.mono}>{u.user_id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}