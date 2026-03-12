"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./devviewAccess.module.css";

export default function DevViewAccessPage() {
  const router = useRouter();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState([]);
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function verifyAdmin() {
    // Must be logged in
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const user = authData?.user;

    if (authErr) console.error("auth.getUser error:", authErr);

    if (!user) {
      router.replace("/login"); // adjust if your login route differs
      return false;
    }

    // Must be enabled platform admin
    const { data, error } = await supabase
      .from("platform_admins")
      .select("user_id, enabled")
      .eq("user_id", user.id)
      .eq("enabled", true)
      .maybeSingle();

    if (error) {
      console.error("admin check error:", error);
      router.replace("/"); // adjust if you prefer /dashboard
      return false;
    }

    if (!data) {
      router.replace("/"); // adjust if you prefer /dashboard
      return false;
    }

    return true;
  }

  async function refresh() {
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("platform_admins")
      .select("user_id, email, enabled, created_at, created_by")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("load platform_admins error:", error);
      setRows([]);
      setErrorMsg(error.message || "Unable to load access list.");
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      setCheckingAccess(true);

      const ok = await verifyAdmin();
      if (!ok) return;

      if (!mounted) return;

      await refresh();

      if (!mounted) return;
      setCheckingAccess(false);
    }

    init();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addEmail(e) {
    e.preventDefault();
    setErrorMsg("");

    const clean = email.trim().toLowerCase();
    if (!clean) return;

    // NOTE:
    // platform_admins is keyed by user_id; inserting by email only will fail
    // unless your DB has triggers/defaults to populate user_id.
    // This keeps behavior consistent with your earlier table shape.
    const { error } = await supabase.from("platform_admins").upsert(
      {
        email: clean,
        enabled: true,
      },
      { onConflict: "email" }
    );

    if (error) {
      console.error("upsert platform_admins error:", error);
      setErrorMsg(
        error.message ||
          "Unable to add email. (This table usually requires user_id.)"
      );
      return;
    }

    setEmail("");
    refresh();
  }

  async function toggleEnabled(user_id, enabled) {
    setErrorMsg("");

    const { error } = await supabase
      .from("platform_admins")
      .update({ enabled: !enabled })
      .eq("user_id", user_id);

    if (error) {
      console.error("toggle enabled error:", error);
      setErrorMsg(error.message || "Unable to update row.");
      return;
    }

    refresh();
  }

  async function removeRow(user_id) {
    setErrorMsg("");

    const { error } = await supabase
      .from("platform_admins")
      .delete()
      .eq("user_id", user_id);

    if (error) {
      console.error("delete row error:", error);
      setErrorMsg(error.message || "Unable to delete row.");
      return;
    }

    refresh();
  }

  // While checking access, don't render the page content
  if (checkingAccess) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.empty}>Checking access…</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Platform Admin Access</h1>
        <p className={styles.subtitle}>
          Grant or revoke Platform Admin access.
        </p>
      </div>

      <form className={styles.form} onSubmit={addEmail}>
        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
          />
        </div>

        <button className={styles.primary} type="submit" disabled={loading}>
          Add / Enable
        </button>
      </form>

      {errorMsg ? <div className={styles.error}>{errorMsg}</div> : null}

      <div className={styles.card}>
        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No admin entries yet.</div>
        ) : (
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.head}`}>
              <div>Email</div>
              <div>Status</div>
              <div>Created</div>
              <div>Actions</div>
            </div>

            {rows.map((r) => (
              <div className={styles.row} key={r.user_id}>
                <div className={styles.strong}>{r.email}</div>

                <div>
                  <span className={r.enabled ? styles.on : styles.off}>
                    {r.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div>
                  {r.created_at
                    ? new Date(r.created_at).toLocaleDateString()
                    : "—"}
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => toggleEnabled(r.user_id, r.enabled)}
                  >
                    {r.enabled ? "Disable" : "Enable"}
                  </button>

                  <button
                    type="button"
                    className={styles.danger}
                    onClick={() => removeRow(r.user_id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}