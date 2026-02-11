"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./DashboardNavbar.module.css";
import { FiSettings } from "react-icons/fi";
import { FiMenu, FiX } from "react-icons/fi";

export default function DashboardNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  // Get the current user session, company profile, and admin status
  const { session, profile, isAdmin } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  function isActive(path) {
    return pathname === path;
  }

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on ESC
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    if (mobileOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.navContainer}>
        {/* Mobile: hamburger */}
        <button
          type="button"
          className={styles.mobileMenuBtn}
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
        >
          <FiMenu className={styles.mobileMenuIcon} />
        </button>

        {/* Logo - takes user to dashboard home */}
        <Link href="/dashboard" className={styles.brand}>
          <Image src="/logo.png" alt="Barix Billing" width={130} height={38} />
        </Link>

        {/* Desktop nav links */}
        <nav className={styles.navCenter}>
          <Link
            href="/dashboard"
            className={`${styles.navLink} ${
              isActive("/dashboard") ? styles.active : ""
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/invoices"
            className={`${styles.navLink} ${
              isActive("/invoices") ? styles.active : ""
            }`}
          >
            Invoices
          </Link>
          <Link
            href="/clients"
            className={`${styles.navLink} ${
              isActive("/clients") ? styles.active : ""
            }`}
          >
            Clients
          </Link>
          <Link
            href="/services"
            className={`${styles.navLink} ${
              isActive("/services") ? styles.active : ""
            }`}
          >
            Services
          </Link>

          {isAdmin && (
            <Link
              href="/team"
              className={`${styles.navLink} ${
                isActive("/team") ? styles.active : ""
              }`}
            >
              Team
            </Link>
          )}
        </nav>

        {/* Desktop right side */}
        <div className={styles.navRight}>
          <Link href="/profile" className={styles.profileLink}>
            {profile?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
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

          <Link
            href="/settings"
            className={`${styles.settingsBtn} ${
              isActive("/settings") ? styles.settingsActive : ""
            }`}
            title="Settings"
          >
            <FiSettings className={styles.settingsIcon} />
          </Link>

          <button onClick={handleLogout} className={styles.logoutBtn}>
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile overlay + drawer */}
      <div
        className={`${styles.mobileOverlay} ${
          mobileOpen ? styles.mobileOverlayOpen : ""
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={`${styles.mobileDrawer} ${
          mobileOpen ? styles.mobileDrawerOpen : ""
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className={styles.mobileDrawerHeader}>
          <div className={styles.mobileDrawerBrand}>
            <Image src="/logo.png" alt="Barix Billing" width={120} height={35} />
          </div>

          <button
            type="button"
            className={styles.mobileCloseBtn}
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <FiX className={styles.mobileCloseIcon} />
          </button>
        </div>

        {/* Profile summary (mobile) */}
        <Link href="/profile" className={styles.mobileProfileCard}>
          {profile?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
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

          <div className={styles.mobileProfileText}>
            <div className={styles.mobileCompanyName}>
              {profile?.company_name || "My Business"}
            </div>
            <div className={styles.mobileProfileHint}>View profile</div>
          </div>
        </Link>

        <nav className={styles.mobileNav}>
          <Link
            href="/dashboard"
            className={`${styles.mobileNavLink} ${
              isActive("/dashboard") ? styles.mobileNavActive : ""
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/invoices"
            className={`${styles.mobileNavLink} ${
              isActive("/invoices") ? styles.mobileNavActive : ""
            }`}
          >
            Invoices
          </Link>
          <Link
            href="/clients"
            className={`${styles.mobileNavLink} ${
              isActive("/clients") ? styles.mobileNavActive : ""
            }`}
          >
            Clients
          </Link>
          <Link
            href="/services"
            className={`${styles.mobileNavLink} ${
              isActive("/services") ? styles.mobileNavActive : ""
            }`}
          >
            Services
          </Link>

          {isAdmin && (
            <Link
              href="/team"
              className={`${styles.mobileNavLink} ${
                isActive("/team") ? styles.mobileNavActive : ""
              }`}
            >
              Team
            </Link>
          )}

          <Link
            href="/settings"
            className={`${styles.mobileNavLink} ${
              isActive("/settings") ? styles.mobileNavActive : ""
            }`}
          >
            <span className={styles.mobileNavIconWrap}>
              <FiSettings className={styles.mobileNavIcon} />
            </span>
            Settings
          </Link>
        </nav>

        <div className={styles.mobileDrawerFooter}>
          <button onClick={handleLogout} className={styles.mobileLogoutBtn}>
            Sign out
          </button>
        </div>
      </aside>
    </header>
  );
}
