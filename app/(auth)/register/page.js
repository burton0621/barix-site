"use client";

/*
  Register Page
  -------------
  New user registration form for contractors.
  Collects email, password, and business name.
  
  After successful signup:
  1. Creates a user in Supabase Auth
  2. Creates a contractor_profiles row linked to that user
  3. Redirects to the profile page so they can complete their setup
  
  We send them to profile first (not dashboard) so they can add
  their full business info before starting to invoice.
*/

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import styles from "./register.module.css";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /*
    Handle form submission
    Creates the user account and their initial profile
  */
  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    // Make sure passwords match before we hit the API
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Step 1: Create user in Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const user = signUpData.user;

    if (!user) {
      setError("User creation failed. Please try again.");
      setLoading(false);
      return;
    }

    // Step 2: Create the contractor profile linked to this user
    const { error: profileError } = await supabase
      .from("contractor_profiles")
      .insert({
        id: user.id,
        company_name: companyName,
      });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Step 3: Send them to profile to complete their setup
    window.location.href = "/profile";
  }

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleRegister}>
        <h1>Create your account</h1>
        <p className={styles.subtitle}>Start invoicing in minutes</p>

        {error && <p className={styles.error}>{error}</p>}

        <input
          type="email"
          placeholder="Email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <input
          type="text"
          placeholder="Business name"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p className={styles.footerText}>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
