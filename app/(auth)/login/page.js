"use client";

/*
  Login Page
  ----------
  Simple email/password login form for returning users.
  
  On successful login:
  - For new invited team members: redirect to /welcome (first login)
  - For returning users: redirect to /dashboard
  
  We detect first-time logins by checking localStorage for a "welcome_seen" flag.
  This ensures invited users get a proper onboarding experience.
*/

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  /*
    Handle form submission
    Attempts to sign in with Supabase, then checks if this is a first-time
    login for an invited user
  */
  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // Check if user has seen the welcome page before
    const userId = data.user?.id;
    const hasSeenWelcome = localStorage.getItem(`welcome_seen_${userId}`);

    // Check if user is an invited team member (not the company owner)
    // Company owners have contractor_profiles with their ID, invited users don't
    const { data: profile } = await supabase
      .from("contractor_profiles")
      .select("id")
      .eq("id", userId)
      .single();

    // If no profile exists (invited user) and haven't seen welcome, show welcome page
    if (!profile && !hasSeenWelcome) {
      router.push("/welcome");
    } else {
      // Regular login - go to dashboard
      router.push("/dashboard");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleLogin} className={styles.form}>
          <label>Email</label>
          <input
            className={styles.input}
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            className={styles.input}
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errorMsg && <p className={styles.error}>{errorMsg}</p>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className={styles.footerText}>
          Don't have an account?{" "}
          <Link href="/register" className={styles.link}>
            Create one here
          </Link>
        </p>
      </div>
    </div>
  );
}
