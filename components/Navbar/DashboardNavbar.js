"use client";

/*
  Dashboard Navbar Component
  --------------------------
  This navbar appears after a user logs in. It's different from the
  marketing navbar because it focuses on app navigation rather than
  selling the product.
  
  Links include:
  - Dashboard (home for logged-in users, will show invoicing overview)
  - Invoices (manage and create invoices)
  - Clients (manage customer list)
  - Profile (contractor business settings)
  
  The user's company logo and name appear on the right with a sign out option.
*/

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./DashboardNavbar.module.css";
import { FiSettings } from "react-icons/fi";

export default function DashboardNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Get the current user session, company profile, and admin status
  const { session, profile, isAdmin } = useAuth();

  /*
    Handle sign out
    Clears the session and sends user back to the landing page
  */
  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  /*
    Auth state listener
    Redirects to home only when user explicitly signs out.
    This prevents logged-out users from seeing the dashboard.
  */
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          router.push("/");
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [router]);

  /*
    Helper to check if a nav link is currently active.
    Used to highlight the current page in the navigation.
  */
  function isActive(path) {
    return pathname === path;
  }

  return (
    <header className={styles.header}>
      <div className={styles.navContainer}>
        
        {/* Logo - takes user to dashboard home */}
        <Link href="/dashboard" className={styles.brand}>
          <Image src="/logo.png" alt="Barix Billing" width={130} height={38} />
        </Link>

        {/* Main dashboard navigation links */}
        <nav className={styles.navCenter}>
          <Link 
            href="/dashboard" 
            className={`${styles.navLink} ${isActive("/dashboard") ? styles.active : ""}`}
          >
            Dashboard
          </Link>
          <Link 
            href="/invoices" 
            className={`${styles.navLink} ${isActive("/invoices") ? styles.active : ""}`}
          >
            Invoices
          </Link>
          <Link 
            href="/clients" 
            className={`${styles.navLink} ${isActive("/clients") ? styles.active : ""}`}
          >
            Clients
          </Link>
          <Link 
            href="/services" 
            className={`${styles.navLink} ${isActive("/services") ? styles.active : ""}`}
          >
            Services
          </Link>
          {/* Team link - only visible to admins */}
          {isAdmin && (
            <Link 
              href="/team" 
              className={`${styles.navLink} ${isActive("/team") ? styles.active : ""}`}
            >
              Team
            </Link>
          )}
        </nav>

        {/* Right side - user info and actions */}
        <div className={styles.navRight}>
          {/* Profile link with company logo or initial */}
          <Link href="/profile" className={styles.profileLink}>
            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Company Logo"
                className={styles.userLogo}
              />
            ) : (
              <div className={styles.userInitial}>
                {profile?.company_name?.charAt(0) || "B"}
              </div>
            )}
            <div className={styles.userInfo}>
              <span className={styles.companyName}>
                {profile?.company_name || "My Business"}
              </span>
              <span className={styles.profileLabel}>Profile</span>
            </div>
          </Link>

          {/* Settings icon - links to account settings (subscription, password, etc.) */}
          <Link 
            href="/settings" 
            className={`${styles.settingsBtn} ${isActive("/settings") ? styles.settingsActive : ""}`}
            title="Settings"
          >
            <FiSettings className={styles.settingsIcon} />  
            
          </Link>

          {/* Sign out button */}
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Sign out
          </button>
        </div>

      </div>
    </header>
  );
}

