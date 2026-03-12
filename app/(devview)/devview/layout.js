"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DevViewLayout({ children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      setChecking(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError || !session?.user) {
        router.replace("/login");
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from("platform_admins")
        .select("user_id, enabled")
        .eq("user_id", userId)
        .eq("enabled", true)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("DevView access check failed:", error);
        router.replace("/dashboard");
        return;
      }

      if (!data) {
        router.replace("/dashboard");
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking || !allowed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
          fontSize: "15px",
          fontWeight: 600,
        }}
      >
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}