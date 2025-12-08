"use client";

/*
  Invoices Page
  -------------
  Lists invoices and allows users to create new ones
*/

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import AddServiceModal from "@/components/Services/AddServiceModal";
import CreateInvoiceModal from "@/components/Invoices/CreateInvoice/CreateInvoiceModal";

import styles from "./invoicesPage.module.css";

export default function InvoicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const formatDate = (value) => {
    if (!value) return "—";

    // If it's already a Date, just show it
    if (value instanceof Date) {
      return value.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    // Handle "YYYY-MM-DD" from Supabase date columns
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map((v) => parseInt(v, 10));
      const d = new Date(year, month - 1, day); // local date, no timezone shift

      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    // Fallback
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;

    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper: format money
  const formatCurrency = (value) => {
    const num = Number(value ?? 0);
    return `$${num.toFixed(2)}`;
  };

  // Fetch invoices for current user
  const fetchInvoices = async (currentUser) => {
    if (!currentUser) return;
    setInvoicesLoading(true);

    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        issue_date,
        due_date,
        total,
        status,
        created_at,
        clients:client_id ( id, name )
      `
      )
      .eq("owner_id", currentUser.id)
      .order("created_at", { ascending: false }); // newest first

    if (error) {
      console.error("Error fetching invoices:", error);
      setInvoices([]);
    } else {
      setInvoices(data || []);
    }

    setInvoicesLoading(false);
  };

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

      setUser(user);
      await fetchInvoices(user);
      setLoading(false);
    }

    init();
  }, [router]);

  const handleInvoiceCreated = async () => {
    if (!user) return;
    await fetchInvoices(user);
  };

  const hasInvoices = invoices.length > 0;

  // Filter for search
  const filteredInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return invoices;

    return invoices.filter((inv) => {
      const values = [
        inv.invoice_number,
        inv.clients?.name,
        inv.status,
        inv.total,
        inv.issue_date,
        inv.due_date,
      ];

      return values.some(
        (v) => v && String(v).toLowerCase().includes(term)
      );
    });
  }, [invoices, searchTerm]);

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
              onClick={() => setIsCreateInvoiceOpen(true)}
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

        {/* Content: table or empty state */}
        {!hasInvoices ? (
          <div className={styles.emptyCard}>
            <h2 className={styles.emptyTitle}>No invoices yet</h2>
            <p className={styles.emptyText}>
              Create your first invoice to start getting paid. It only takes a
              minute.
            </p>

            <button
              className={styles.primaryButton}
              onClick={() => setIsCreateInvoiceOpen(true)}
            >
              Create Your First Invoice
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar: search */}
            <div className={styles.toolbarRow}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search invoices (number, client, status...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {invoicesLoading ? (
              <div className={styles.tableLoading}>Loading invoices...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className={styles.noResultsBox}>
                <p className={styles.noResultsText}>
                  No invoices match your search.
                </p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Invoice #</th>
                    <th className={styles.th}>Client</th>
                    <th className={styles.th}>Issue Date</th>
                    <th className={styles.th}>Due Date</th>
                    <th className={styles.thRight}>Total</th>
                    <th className={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className={styles.tableRow}
                      onClick={() => {
                        // Later: router.push(`/invoices/${inv.id}`);
                      }}
                    >
                      <td className={styles.td}>
                        {inv.invoice_number || "—"}
                      </td>
                      <td className={styles.td}>
                        {inv.clients?.name || "—"}
                      </td>
                      <td className={styles.td}>{formatDate(inv.issue_date)}</td>
                      <td className={styles.td}>{formatDate(inv.due_date)}</td>
                      <td className={`${styles.td} ${styles.tdAmount}`}>
                        {formatCurrency(inv.total)}
                      </td>
                      <td className={styles.td}>
                        <span className={styles.statusBadge}>
                          {inv.status || "draft"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>

      {/* Add New Service modal */}
      <AddServiceModal
        open={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
      />

      {/* Create Invoice modal */}
      <CreateInvoiceModal
        open={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        onCreated={handleInvoiceCreated}
      />
    </div>
  );
}
