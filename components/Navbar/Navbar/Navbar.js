"use client";

/*
  Navbar Component
  ----------------
  This is the main navigation bar that appears at the top of every page.
  It handles two states:
  1. Logged out: Shows marketing nav links + Sign in / Get Started buttons
  2. Logged in: Shows user's company logo, name, and a sign out button
  
  The navbar also listens for auth state changes so it can redirect
  users to the home page after they sign out.
*/

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const router = useRouter();
  
  // Pull session and profile from our auth context
  // Session tells us if user is logged in, profile has their company info
  const { session, profile } = useAuth();

  /*
    Handle logout
    We call Supabase to sign out, refresh the page state,
    then redirect to the landing page
  */
  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  /*
    Auth state listener
    We only want to redirect when someone explicitly signs out.
    Without the event check, this would redirect ALL visitors
    (including people just browsing) back to home since they
    don't have a session either.
  */
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          router.push("/");
        }
      }
    );

    // Clean up the listener when component unmounts
    return () => listener.subscription.unsubscribe();
  }, [router]);

  return (
    <header className={styles.header}>
      <div className={styles.navContainer}>
        
        {/* Logo - clicking takes you home */}
        <Link href="/" className={styles.brand}>
          <Image src="/logo.png" alt="Barix Billing" width={140} height={40} />
        </Link>

        {/* Right side navigation */}
        <nav className={styles.navRight}>
          {/* Marketing pages - visible to everyone */}
          <Link href="/product" className={styles.navLink}>Product</Link>
          <Link href="/pricing" className={styles.navLink}>Pricing</Link>
          <Link href="/industries" className={styles.navLink}>Industries</Link>

          {/* 
            Conditional rendering based on login state:
            - Logged in: Show company info and sign out
            - Logged out: Show sign in and get started buttons
          */}
          {session ? (
            <div className={styles.userSection}>
              {/* Only show logo if the contractor has uploaded one */}
              {profile?.logo_url && (
                <img
                  src={profile.logo_url}
                  alt="Company Logo"
                  className={styles.userLogo}
                />
              )}
              <span className={styles.companyName}>
                {profile?.company_name}
              </span>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                Sign out
              </button>
            </div>
          ) : (
            <div className={styles.authButtons}>
              {/* Subtle sign in for returning users */}
              <Link href="/login" className={styles.signInBtn}>Sign in</Link>
              {/* Prominent CTA for new users */}
              <Link href="/register" className={styles.loginBtn}>Get Started</Link>
            </div>
          )}
        </nav>

      </div>
    </header>
  );
}
