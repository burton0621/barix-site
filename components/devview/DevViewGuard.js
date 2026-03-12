"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./DevViewGuard.module.css";

export default function DevViewGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const userEmail = auth?.user?.email || "";
      if (!userEmail) {
        if (!isMounted) return;
        setEmail("");
        setAllowed(false);
        setLoading(false);
        return;
      }

      setEmail(userEmail);

      // Check allowlist row (RLS allows user to see their own row if it exists)
      const { data, error } = await supabase
        .from("devview_access")
        .select("enabled")
        .eq("email", userEmail)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        // If RLS blocks or table missing, treat as not allowed
        setAllowed(false);
      } else {
        setAllowed(!!data?.enabled);
      }

      setLoading(false);
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.stateWrap}>
        <div className={styles.card}>Checking DevView access…</div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className={styles.stateWrap}>
        <div className={styles.card}>
          <h2 className={styles.title}>Access restricted</h2>
          <p className={styles.text}>
            {email ? (
              <>
                <b>{email}</b> does not have DevView access.
              </>
            ) : (
              <>You must be logged in to access DevView.</>
            )}
          </p>
        </div>
      </div>
    );
  }

  return children;
}