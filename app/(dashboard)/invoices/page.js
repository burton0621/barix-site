"use client";

/*
  Invoices Page
  -------------
  This page will list all invoices and allow users to create new ones.
  For now, it's a placeholder showing an empty state with a CTA
  to create the first invoice.

*/

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import AddServiceModal from "@/components/Services/AddServiceModal";

import styles from "./invoicesPage.module.css";

export default function InvoicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);

  // Protect this route - only logged in users can access
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setLoading(false);
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <DashboardNavbar />

      <main className={styles.main}>
        {/* Page Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Invoices</h1>
            <p className={styles.subtitle}>Create and manage your invoices</p>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.primaryButton}
              onClick={() => alert("Invoice creation coming soon!")}
            >
              Create Invoice
            </button>

            <button
              className={styles.secondaryButton}
              onClick={() => setIsAddServiceOpen(true)}
            >
              Add New Service
            </button>
          </div>
        </div>

        {/* Empty State */}
        <div className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>No invoices yet</h2>
          <p className={styles.emptyText}>
            Create your first invoice to start getting paid. It only takes a
            minute.
          </p>

          <button
            className={styles.primaryButton}
            onClick={() => alert("Invoice creation coming soon!")}
          >
            Create Your First Invoice
          </button>
        </div>
      </main>

      {/* Add New Service modal */}
      <AddServiceModal
        open={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
      />
    </div>
  );
}
