"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./getStartedCard.module.css";

export default function GetStartedCard() {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [clientsCount, setClientsCount] = useState(0);
  const [serviceRegionsCount, setServiceRegionsCount] = useState(0);
  const [invoicesCount, setInvoicesCount] = useState(0);

  // Fetch all necessary counts
  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const [clients, regions, invoices] = await Promise.all([
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id),
        supabase
          .from("contractor_service_regions")
          .select("id", { count: "exact", head: true })
          .eq("contractor_id", user.id), // change column if needed
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .neq("status", "draft"),
      ]);

      setClientsCount(clients.count || 0);
      setServiceRegionsCount(regions.count || 0);
      setInvoicesCount(invoices.count || 0);

      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) return null;

  // ---- Completion logic ----
  const hasBusinessName = !!profile?.company_name;

  const hasLogo = !!(
    profile?.logo_url ||
    profile?.logo ||
    profile?.logo_path
  );

  const hasServiceRegions = serviceRegionsCount > 0;

  const profileDone = hasBusinessName && hasLogo && hasServiceRegions;
  const clientsDone = clientsCount > 0;
  const invoicesDone = invoicesCount > 0;

  // 🔥 Dynamic text for "Set Up Your Profile"
  let profileStepText;
  if (profileDone) {
    profileStepText = "Your profile is complete.";
  } else {
    const missing = [];
    if (!hasBusinessName) missing.push("business info");
    if (!hasLogo) missing.push("logo");
    if (!hasServiceRegions) missing.push("service regions");

    if (missing.length === 1) {
      profileStepText = `Add your ${missing[0]}.`;
    } else if (missing.length === 2) {
      profileStepText = `Add your ${missing[0]} and ${missing[1]}.`;
    } else {
      // all three missing
      profileStepText = `Add your ${missing[0]}, ${missing[1]}, and ${missing[2]}.`;
    }
  }

  // Hide card if all three steps are complete
  if (profileDone && clientsDone && invoicesDone) {
    return null;
  }

  return (
    <div className={styles.getStartedCard}>
      <h2 className={styles.sectionTitle}>Get Started</h2>

      <div className={styles.stepsGrid}>
        {/* Step 1: Profile */}
        <div className={styles.stepCard}>
          <div
            className={
              profileDone
                ? styles.stepNumberCompleted
                : styles.stepNumberActive
            }
          >
            1
          </div>
          <h3 className={styles.stepTitle}>Set Up Your Profile</h3>
          <p className={styles.stepText}>{profileStepText}</p>
          {profileDone ? (
            <span className={styles.stepCompletedLabel}>Completed</span>
          ) : (
            <Link href="/profile" className={styles.primaryLink}>
              Complete profile
            </Link>
          )}
        </div>

        {/* Step 2: Clients */}
        <div className={styles.stepCard}>
          <div
            className={
              clientsDone
                ? styles.stepNumberCompleted
                : styles.stepNumberInactive
            }
          >
            2
          </div>
          <h3 className={styles.stepTitle}>Add Your Clients</h3>
          <p className={styles.stepText}>
            Import or add the customers you'll be invoicing.
          </p>
          {clientsDone ? (
            <span className={styles.stepCompletedLabel}>Completed</span>
          ) : (
            <Link href="/clients" className={styles.secondaryLink}>
              Add clients
            </Link>
          )}
        </div>

        {/* Step 3: Invoice */}
        <div className={styles.stepCard}>
          <div
            className={
              invoicesDone
                ? styles.stepNumberCompleted
                : styles.stepNumberInactive
            }
          >
            3
          </div>
          <h3 className={styles.stepTitle}>Create Your First Invoice</h3>
          <p className={styles.stepText}>
            Send a professional invoice and get paid faster.
          </p>
          {invoicesDone ? (
            <span className={styles.stepCompletedLabel}>Completed</span>
          ) : (
            <Link href="/invoices" className={styles.secondaryLink}>
              Create invoice
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
