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
import CreateInvoiceButton from "@/components/Invoices/CreateInvoiceButton/createInvoiceButton";

import styles from "./invoicesPage.module.css";

export default function InvoicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [pageSize, setPageSize] = useState(15);

  // sorting + pagination
  const [sortField, setSortField] = useState("created_at"); // default: newest first
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" | "desc"
  const [currentPage, setCurrentPage] = useState(1);

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
      const d = new Date(year, month - 1, day); // local date

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
      .order("created_at", { ascending: false }); // newest first by default

    if (error) {
      console.error("Error fetching invoices:", error);
      setInvoices([]);
    } else {
      setInvoices(data || []);
    }

    setInvoicesLoading(false);
  };

  useEffect(() => {
    const updatePageSize = () => {
      if (window.innerWidth < 640) {
        setPageSize(7); // mobile
      } else {
        setPageSize(15); // tablet/desktop
      }
    };

    updatePageSize(); // run once on mount
    window.addEventListener("resize", updatePageSize);

    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

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

  // reset page when search/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      // sensible defaults: dates & created_at -> desc, others -> asc
      if (field === "issue_date" || field === "due_date" || field === "created_at") {
        setSortDirection("desc");
      } else {
        setSortDirection("asc");
      }
    }
  }

  function renderSortIcon(field) {
    if (sortField !== field) {
      return <span className={styles.sortIcon}>↕</span>;
    }
    return (
      <span className={`${styles.sortIcon} ${styles.sortIconActive}`}>
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  }

  // Full pipeline: filter -> sort -> paginate
  const processed = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // 1) Filter
    let filtered = invoices;
    if (term) {
      filtered = invoices.filter((inv) => {
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
    }

    // 2) Sort
    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;

      const stringCompare = (x, y) =>
        String(x || "").localeCompare(String(y || ""), undefined, {
          sensitivity: "base",
        }) * dir;

      const numberCompare = (x, y) => {
        const nx = Number(x || 0);
        const ny = Number(y || 0);
        if (nx === ny) return 0;
        return nx > ny ? dir : -dir;
      };

      const dateCompare = (x, y) => {
        if (!x && !y) return 0;
        if (!x) return -dir;
        if (!y) return dir;

        // handle YYYY-MM-DD or timestamps
        const dx = new Date(x).getTime();
        const dy = new Date(y).getTime();
        return (dx - dy) * dir;
      };

      if (sortField === "invoice_number") {
        return stringCompare(a.invoice_number, b.invoice_number);
      }

      if (sortField === "client") {
        return stringCompare(a.clients?.name, b.clients?.name);
      }

      if (sortField === "issue_date") {
        return dateCompare(a.issue_date, b.issue_date);
      }

      if (sortField === "due_date") {
        return dateCompare(a.due_date, b.due_date);
      }

      if (sortField === "total") {
        return numberCompare(a.total, b.total);
      }

      if (sortField === "status") {
        return stringCompare(a.status, b.status);
      }

      if (sortField === "created_at") {
        return dateCompare(a.created_at, b.created_at);
      }

      return 0;
    });

    // 3) Pagination
    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(currentPage, totalPages);
    const startIndex = (page - 1) * pageSize;
    const pageItems = sorted.slice(startIndex, startIndex + pageSize);

    return {
      filteredCount: filtered.length,
      totalItems,
      totalPages,
      page,
      startIndex,
      pageItems,
    };
  }, [invoices, searchTerm, sortField, sortDirection, currentPage, pageSize]);

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
            <CreateInvoiceButton
              onCreated={handleInvoiceCreated}
              buttonText="Create Invoice"
              className={styles.primaryButton}
            />

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

            <CreateInvoiceButton
              onCreated={handleInvoiceCreated}
              buttonText="Create Your First Invoice"
              className={styles.primaryButton}
            />
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
            ) : processed.totalItems === 0 ? (
              <div className={styles.noResultsBox}>
                <p className={styles.noResultsText}>
                  No invoices match your search.
                </p>
              </div>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th
                        className={styles.sortableHeader}
                        onClick={() => handleSort("invoice_number")}
                      >
                        <div className={styles.headerInner}>
                          <span>Invoice #</span>
                          {renderSortIcon("invoice_number")}
                        </div>
                      </th>
                      <th
                        className={styles.sortableHeader}
                        onClick={() => handleSort("client")}
                      >
                        <div className={styles.headerInner}>
                          <span>Client</span>
                          {renderSortIcon("client")}
                        </div>
                      </th>
                      <th
                        className={styles.sortableHeader}
                        onClick={() => handleSort("issue_date")}
                      >
                        <div className={styles.headerInner}>
                          <span>Issue Date</span>
                          {renderSortIcon("issue_date")}
                        </div>
                      </th>
                      <th
                        className={styles.sortableHeader}
                        onClick={() => handleSort("due_date")}
                      >
                        <div className={styles.headerInner}>
                          <span>Due Date</span>
                          {renderSortIcon("due_date")}
                        </div>
                      </th>
                      <th
                        className={`${styles.sortableHeader} ${styles.thRight}`}
                        onClick={() => handleSort("total")}
                      >
                        <div className={styles.headerInner}>
                          <span>Total</span>
                          {renderSortIcon("total")}
                        </div>
                      </th>
                      <th
                        className={styles.sortableHeader}
                        onClick={() => handleSort("status")}
                      >
                        <div className={styles.headerInner}>
                          <span>Status</span>
                          {renderSortIcon("status")}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {processed.pageItems.map((inv) => (
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
                        <td className={styles.td}>
                          {formatDate(inv.issue_date)}
                        </td>
                        <td className={styles.td}>
                          {formatDate(inv.due_date)}
                        </td>
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

                {/* Pagination */}
                <div className={styles.paginationRow}>
                  <div className={styles.pageInfo}>
                    {processed.totalItems > 0 && (
                      <>
                        Showing{" "}
                        {processed.startIndex + 1}–
                        {Math.min(
                          processed.startIndex + pageSize,
                          processed.totalItems
                        )}{" "}
                        of {processed.totalItems} invoices
                      </>
                    )}
                  </div>
                  <div className={styles.pageControls}>
                    <button
                      className={styles.pageButton}
                      disabled={processed.page === 1}
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                    >
                      Previous
                    </button>
                    {Array.from(
                      { length: processed.totalPages },
                      (_, idx) => idx + 1
                    ).map((page) => (
                      <button
                        key={page}
                        className={
                          page === processed.page
                            ? styles.pageButtonActive
                            : styles.pageButton
                        }
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className={styles.pageButton}
                      disabled={processed.page === processed.totalPages}
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(processed.totalPages, p + 1)
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Add New Service modal */}
      <AddServiceModal
        open={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
      />
    </div>
  );
}
