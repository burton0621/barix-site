"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import GetStartedCard from "@/components/dashboard/getStartedCard/getStartedCard";
import CreateInvoiceButton from "@/components/Invoices/CreateInvoiceButton/createInvoiceButton";

import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);

  // Keep track of userId so we can refresh after creating invoices
  const [userId, setUserId] = useState(null);

  // Weekly/Monthly toggle (shown on both desktop + mobile)
  const [range, setRange] = useState("week"); // "week" | "month"

  // Mobile detection (used only for rounding currency)
  const [isMobile, setIsMobile] = useState(false);

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

  // Track mobile width for currency rounding
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 600);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Currency helper (round to whole dollars on mobile to prevent overlap)
  const formatCurrency = (value) => {
    const num = Number(value || 0);
    if (isMobile) {
      return `$${Math.round(num).toLocaleString()}`;
    }
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

  // Figure out the date window start (local time)
  const rangeStartDate = useMemo(() => {
    const now = new Date();
    const start = new Date(now);

    if (range === "week") {
      start.setDate(now.getDate() - 6); // last 7 days incl today
    } else {
      start.setDate(now.getDate() - 29); // last 30 days incl today
    }

    // normalize to start of day
    start.setHours(0, 0, 0, 0);
    return start;
  }, [range]);

  // Convert to YYYY-MM-DD for issue_date filtering
  const rangeStartISODate = useMemo(() => {
    const y = rangeStartDate.getFullYear();
    const m = String(rangeStartDate.getMonth() + 1).padStart(2, "0");
    const d = String(rangeStartDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [rangeStartDate]);

  async function fetchInvoiceMetrics(ownerId) {
    setMetricsLoading(true);

    // We filter invoices in the selected window by issue_date
    // (Assumes issue_date is stored as YYYY-MM-DD in your DB)
    const { data, error } = await supabase
      .from("invoices")
      .select("id, status, total, issue_date")
      .eq("owner_id", ownerId)
      .gte("issue_date", rangeStartISODate);

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

      // total invoices in range = everything that is not draft
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

  async function fetchRecentInvoices(ownerId) {
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
      .eq("owner_id", ownerId)
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

  // Auth check + initial load
  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      await Promise.all([
        fetchInvoiceMetrics(user.id),
        fetchRecentInvoices(user.id),
      ]);

      setLoading(false);
    }

    init();
  }, [router]); // only runs once

  // Re-fetch metrics whenever the range changes (week/month)
  useEffect(() => {
    if (!userId) return;
    fetchInvoiceMetrics(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStartISODate, userId]);

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  const metricsLabelSuffix = metricsLoading ? "" : "";
  const rangeLabel = range === "week" ? "This Week" : "This Month";

  return (
    <div className={styles.page}>
      <DashboardNavbar />

      <main className={styles.main}>
        {/* Welcome Header */}
        <div className={styles.headerRow}>
          <div className={styles.headerBlock}>
            <h1 className={styles.title}>
              Welcome back
              {profile?.company_name ? `, ${profile.company_name}` : ""}
            </h1>
            <p className={styles.subtitle}>
              Here's what's happening with your invoicing today.
            </p>
          </div>

          <div className={styles.headerActions}>
            <CreateInvoiceButton
              onCreated={() => {
                // Refresh the dashboard data when an invoice is created
                if (userId) {
                  fetchInvoiceMetrics(userId);
                  fetchRecentInvoices(userId);
                }
              }}
              buttonText="Create Invoice"
              documentType="invoice"
              className={styles.primaryButton}
            />
          </div>
        </div>

        {/* Quick Stats Panel (big card wrapping the 4 stat cards + toggle) */}
        <div className={styles.statsPanel}>
          <div className={styles.statsPanelHeader}>
            <div>
              <h2 className={styles.statsPanelTitle}>Quick Stats</h2>
              <p className={styles.statsPanelSub}>
                {rangeLabel} overview{metricsLabelSuffix}
              </p>
            </div>
          </div>

          {/* The 4 cards - keep your existing responsive grid */}
          <div className={styles.statsGrid}>
            {/* Total invoices (non-draft) */}
            <div className={styles.statCard}>
              <p className={styles.statLabel}>
                Total Sent Invoices{metricsLabelSuffix}
              </p>
              <p className={styles.statValue}>{totalInvoicesCount}</p>
              <p className={styles.statSubLabel}>
                {/* Non-draft invoices in the last {range === "week" ? "7 days" : "30 days"} */}
              </p>
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
                {pendingCount} sent invoices
                {/* {pendingCount === 1 ? "" : "s"} in the last */}
                {/* {range === "week" ? "7 days" : "30 days"} */}
              </p>
            </div>

            {/* Revenue (paid) */}
            <div className={styles.statCard}>
              <p className={styles.statLabel}>
                Invoice Revenue{metricsLabelSuffix}
              </p>
              <p className={styles.statValueRevenue}>
                {formatCurrency(revenueAmount)}
              </p>
              <p className={styles.statSubLabel}>
                {paidCount} paid invoice's
                {/* {paidCount === 1 ? "" : "s"} in the last {" "} */}
                {/* {range === "week" ? "7 days" : "30 days"} */}
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
                {overdueCount} overdue invoice's
                {/* {overdueCount === 1 ? "" : "s"} in the last {" "} */}
                {/* {range === "week" ? "7 days" : "30 days"} */}
              </p>
            </div>
          </div>

          {/* Weekly / Monthly toggle (shown on BOTH desktop + mobile) */}
          <div className={styles.rangeToggleRow}>
            <span
              className={styles.rangeLabel}
              style={{ opacity: range === "week" ? 1 : 0.65 }}
            >
              Weekly
            </span>

            <button
              type="button"
              className={`${styles.rangeToggle} ${
                range === "month" ? styles.rangeToggleOn : ""
              }`}
              onClick={() => setRange((prev) => (prev === "week" ? "month" : "week"))}
              aria-label="Toggle weekly or monthly"
              aria-pressed={range === "month"}
            >
              <span className={styles.rangeToggleKnob} />
            </button>

            <span
              className={styles.rangeLabel}
              style={{ opacity: range === "month" ? 1 : 0.65 }}
            >
              Monthly
            </span>
          </div>
        </div>

        {/* Get Started Section */}
        <GetStartedCard />

        {/* Recent Activity */}
        <div className={styles.recentCard}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>

          {recentLoading ? (
            <div className={styles.recentEmpty}>
              <p className={styles.recentEmptyText}>Loading recent invoices…</p>
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
