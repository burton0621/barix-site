"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const router = useRouter();
  const { session, profile } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/"); // Redirect to landing page
  }

  useEffect(() => {
    // If the session becomes null → redirect globally
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.push("/");
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.navContainer}>
        
        <Link href="/" className={styles.brand}>
          <Image src="/logo.png" alt="Barix Billing" width={140} height={40} />
        </Link>

        <nav className={styles.navRight}>
          <Link href="/product" className={styles.navLink}>Product</Link>
          <Link href="/pricing" className={styles.navLink}>Pricing</Link>
          <Link href="/industries" className={styles.navLink}>Industries</Link>

          {session ? (
            <div className={styles.userSection}>
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
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className={styles.loginBtn}>Login</Link>
          )}
        </nav>

      </div>
    </header>
  );
}
