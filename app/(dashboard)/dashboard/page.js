"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import GetStartedCard from "@/components/dashboard/getStartedCard/getStartedCard";

import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);

  // Metrics
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [revenueAmount, setRevenueAmount] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueAmount, setOverdueAmount] = useState(0);

  // Recent activity
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  // Currency helper
  const formatCurrency = (value) => {
    const num = Number(value || 0);
    return `$${num.toFixed(2)}`;
  };

  // Date helper (handles YYYY-MM-DD from Supabase)
  const formatDate = (value) => {
    if (!value) return "—";

    if (value instanceof Date) {
      return value.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map((v) => parseInt(v, 10));
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;

    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  async function fetchInvoiceMetrics(userId) {
    setMetricsLoading(true);

    const { data, error } = await supabase
      .from("invoices")
      .select("id, status, total")
      .eq("owner_id", userId);

    if (error) {
      console.error("Error loading invoice metrics:", error);
      setMetricsLoading(false);
      return;
    }

    const invoices = data || [];

    let totalInvoices = 0;
    let pendingCountTmp = 0;
    let pendingAmountTmp = 0;
    let revenueAmountTmp = 0;
    let paidCountTmp = 0;
    let overdueCountTmp = 0;
    let overdueAmountTmp = 0;

    invoices.forEach((inv) => {
      const status = inv.status || "";
      const total = Number(inv.total || 0);

      // total invoices = everything that is not draft
      if (status !== "draft") {
        totalInvoices += 1;
      }

      if (status === "sent") {
        pendingCountTmp += 1;
        pendingAmountTmp += total;
      }

      if (status === "paid") {
        paidCountTmp += 1;
        revenueAmountTmp += total;
      }

      if (status === "overdue") {
        overdueCountTmp += 1;
        overdueAmountTmp += total;
      }
    });

    setTotalInvoicesCount(totalInvoices);
    setPendingCount(pendingCountTmp);
    setPendingAmount(pendingAmountTmp);
    setRevenueAmount(revenueAmountTmp);
    setPaidCount(paidCountTmp);
    setOverdueCount(overdueCountTmp);
    setOverdueAmount(overdueAmountTmp);

    setMetricsLoading(false);
  }

  async function fetchRecentInvoices(userId) {
    setRecentLoading(true);

    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        issue_date,
        status,
        total,
        clients:client_id ( name )
      `
      )
      .eq("owner_id", userId)
      .neq("status", "draft")
      .order("issue_date", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error loading recent invoices:", error);
      setRecentInvoices([]);
      setRecentLoading(false);
      return;
    }

    setRecentInvoices(data || []);
    setRecentLoading(false);
  }

  // Auth check + load metrics + recent activity
  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      await Promise.all([
        fetchInvoiceMetrics(user.id),
        fetchRecentInvoices(user.id),
      ]);

      setLoading(false);
    }

    init();
  }, [router]);

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  const metricsLabelSuffix = metricsLoading ? "…" : "";

  return (
    <div className={styles.page}>
      <DashboardNavbar />

      <main className={styles.main}>
        {/* Welcome Header */}
        <div className={styles.headerBlock}>
          <h1 className={styles.title}>
            Welcome back
            {profile?.company_name ? `, ${profile.company_name}` : ""}
          </h1>
          <p className={styles.subtitle}>
            Here's what's happening with your invoicing today.
          </p>
        </div>

        {/* Quick Stats */}
        <div className={styles.statsGrid}>
          {/* Total invoices (non-draft) */}
          <div className={styles.statCard}>
            <p className={styles.statLabel}>
              Total Invoices{metricsLabelSuffix}
            </p>
            <p className={styles.statValue}>{totalInvoicesCount}</p>
            <p className={styles.statSubLabel}>Non-draft invoices</p>
          </div>

          {/* Pending payments (sent) */}
          <div className={styles.statCard}>
            <p className={styles.statLabel}>
              Pending Payments{metricsLabelSuffix}
            </p>
            <p className={styles.statValuePending}>
              {formatCurrency(pendingAmount)}
            </p>
            <p className={styles.statSubLabel}>
              {pendingCount} sent invoice{pendingCount === 1 ? "" : "s"}
            </p>
          </div>

          {/* Revenue (paid) */}
          <div className={styles.statCard}>
            <p className={styles.statLabel}>
              Total Revenue{metricsLabelSuffix}
            </p>
            <p className={styles.statValueRevenue}>
              {formatCurrency(revenueAmount)}
            </p>
            <p className={styles.statSubLabel}>
              {paidCount} paid invoice{paidCount === 1 ? "" : "s"}
            </p>
          </div>

          {/* Overdue (count + amount) */}
          <div className={styles.statCard}>
            <p className={styles.statLabel}>
              Overdue Invoices{metricsLabelSuffix}
            </p>
            <p className={styles.statValueOverdue}>
              {formatCurrency(overdueAmount)}
            </p>
            <p className={styles.statSubLabel}>
              {overdueCount} overdue invoice
              {overdueCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Get Started Section (all logic inside the component) */}
        <GetStartedCard />

        {/* Recent Activity */}
        <div className={styles.recentCard}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>

          {recentLoading ? (
            <div className={styles.recentEmpty}>
              <p className={styles.recentEmptyText}>
                Loading recent invoices…
              </p>
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className={styles.recentEmpty}>
              <p className={styles.recentEmptyText}>No recent activity yet.</p>
              <p className={styles.recentEmptySubText}>
                Your invoices and payments will show up here.
              </p>
            </div>
          ) : (
            <div className={styles.recentList}>
              {recentInvoices.map((inv) => (
                <div key={inv.id} className={styles.recentRow}>
                  <div className={styles.recentMain}>
                    <div className={styles.recentTitle}>
                      {inv.invoice_number || "Untitled invoice"}
                    </div>
                    <div className={styles.recentClient}>
                      {inv.clients?.name || "Unknown client"}
                    </div>
                  </div>
                  <div className={styles.recentMeta}>
                    <span className={styles.recentStatusBadge}>
                      {inv.status || "draft"}
                    </span>
                    <span className={styles.recentDate}>
                      {formatDate(inv.issue_date)}
                    </span>
                    <span className={styles.recentAmount}>
                      {formatCurrency(inv.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
