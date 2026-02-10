"use client";

/*
  Invoices & Estimates Page
  -------------------------
  Lists both invoices and estimates with tab filtering.
  
  Workflow:
  - Estimates: Create → Send to client → Client accepts → Becomes invoice (pending)
  - Invoices: Pending → Send → Client pays → Paid
  
  Tabs: All | Estimates | Invoices
*/

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import AddServiceModal from "@/components/Services/AddServiceModal";
import CreateInvoiceButton from "@/components/Invoices/CreateInvoiceButton/createInvoiceButton";
import InvoiceModal from "@/components/Invoices/InvoiceModal/invoiceModal";
import OnboardingGate from "@/components/common/OnboardingGate/OnboardingGate";
import Toast from "@/components/common/Toast/Toast";
import ConfirmDialog from "@/components/common/ConfirmDialog/ConfirmDialog";

import styles from "./invoicesPage.module.css";

export default function InvoicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);

  // State for the edit invoice modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Toast notification state for user-friendly feedback
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });
  
  // Delete confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    invoice: null,
    docType: "",
  });
  
  // Helper to show toast notifications
  const showToast = (message, type = "error") => {
    setToast({ open: true, message, type });
  };

  // Tab state: "all" | "estimate" | "invoice"
  const [activeTab, setActiveTab] = useState("all");

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

  // Helper: get the appropriate CSS class for a status badge
  // Different statuses get different colors to make scanning the table easier
  // Estimates: draft, sent, accepted, declined
  // Invoices: draft, pending, sent, paid, overdue
  const getStatusBadgeClass = (status) => {
    const normalizedStatus = (status || "draft").toLowerCase();
    switch (normalizedStatus) {
      case "paid":
        return styles.statusPaid;
      case "accepted":
        return styles.statusAccepted;
      case "sent":
        return styles.statusSent;
      case "pending":
        return styles.statusPending;
      case "overdue":
        return styles.statusOverdue;
      case "declined":
        return styles.statusDeclined;
      case "draft":
      default:
        return styles.statusDraft;
    }
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
        client_id,
        invoice_number,
        issue_date,
        due_date,
        total,
        status,
        notes,
        document_type,
        converted_from_id,
        created_at,
        clients:client_id ( id, name, email )
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

  // Refreshes the invoice list after creating or editing an invoice
  const handleInvoiceCreated = async () => {
    if (!user) return;
    await fetchInvoices(user);
  };

  // Opens the edit modal with the selected invoice's data
  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsEditModalOpen(true);
  };

  // Closes the edit modal and clears the selected invoice
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedInvoice(null);
  };

  // Called when an invoice is successfully updated
  const handleInvoiceSaved = async () => {
    await fetchInvoices(user);
    handleCloseEditModal();
  };

  // Deletes an invoice/estimate after confirmation
  // Also deletes associated line items (cascade should handle this, but we do it explicitly)
  // Shows the delete confirmation dialog before proceeding
  const handleDeleteClick = (invoice) => {
    const docType = invoice.document_type === "estimate" ? "estimate" : "invoice";
    setDeleteConfirm({
      open: true,
      invoice,
      docType,
    });
  };

  // Actually performs the delete after user confirms
  const handleConfirmDelete = async () => {
    const { invoice, docType } = deleteConfirm;
    setDeleteConfirm({ ...deleteConfirm, open: false });

    try {
      // First delete line items (in case cascade delete isn't set up)
      const { error: lineItemsError } = await supabase
        .from("invoice_line_items")
        .delete()
        .eq("invoice_id", invoice.id);

      if (lineItemsError) {
        console.error("Error deleting line items:", lineItemsError);
        // Continue anyway - the invoice delete might still work
      }

      // Now delete the invoice itself
      const { error: invoiceError } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoice.id);

      if (invoiceError) {
        console.error("Error deleting invoice:", invoiceError);
        showToast(`Failed to delete ${docType}: ${invoiceError.message}`);
        return;
      }

      // Show success message and refresh the list
      showToast(`${docType.charAt(0).toUpperCase() + docType.slice(1)} deleted successfully`, "success");
      await fetchInvoices(user);
      
    } catch (err) {
      console.error("Unexpected error deleting invoice:", err);
      showToast(`An unexpected error occurred while deleting the ${docType}.`);
    }
  };

  const hasInvoices = invoices.length > 0;

  // reset page when search/sort/tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection, activeTab]);

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

  // Full pipeline: tab filter -> search filter -> sort -> paginate
  const processed = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // 1) Filter by tab (document type)
    let filtered = invoices;
    if (activeTab === "estimate") {
      filtered = invoices.filter((inv) => inv.document_type === "estimate");
    } else if (activeTab === "invoice") {
      filtered = invoices.filter((inv) => inv.document_type === "invoice" || !inv.document_type);
    }
    // "all" shows everything

    // 2) Filter by search term
    if (term) {
      filtered = filtered.filter((inv) => {
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
  }, [invoices, searchTerm, sortField, sortDirection, currentPage, pageSize, activeTab]);

  // Calculate counts for each tab
  const tabCounts = useMemo(() => {
    const estimates = invoices.filter((inv) => inv.document_type === "estimate").length;
    const invoiceCount = invoices.filter((inv) => inv.document_type === "invoice" || !inv.document_type).length;
    return {
      all: invoices.length,
      estimate: estimates,
      invoice: invoiceCount,
    };
  }, [invoices]);

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      {/* Toast notification for user-friendly feedback */}
      <Toast 
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />
      
      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title={`Delete ${deleteConfirm.docType}?`}
        message={`Are you sure you want to delete "${deleteConfirm.invoice?.invoice_number}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmType="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ ...deleteConfirm, open: false })}
      />
      
      <div className={styles.page}>
        <DashboardNavbar />

        <OnboardingGate>
          <main className={styles.main}>
            {/* Page Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
              <h1 className={styles.title}>Invoices & Estimates</h1>
              <p className={styles.subtitle}>Create estimates for quotes, invoices for billing</p>
          </div>

          <div className={styles.headerActions}>
            <CreateInvoiceButton
              onCreated={handleInvoiceCreated}
              buttonText="Create Estimate"
              documentType="estimate"
              className={styles.secondaryButton}
            />

            <CreateInvoiceButton
              onCreated={handleInvoiceCreated}
              buttonText="Create Invoice"
              documentType="invoice"
              className={styles.primaryButton}
            />
          </div>
        </div>

        {/* Tabs for filtering by document type */}
        <div className={styles.tabsContainer}>
          <button
            className={`${styles.tab} ${activeTab === "all" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All ({tabCounts.all})
          </button>
          <button
            className={`${styles.tab} ${activeTab === "estimate" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("estimate")}
          >
            Estimates ({tabCounts.estimate})
          </button>
          <button
            className={`${styles.tab} ${activeTab === "invoice" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("invoice")}
          >
            Invoices ({tabCounts.invoice})
          </button>
        </div>

        {/* Content: table or empty state */}
        {!hasInvoices ? (
          <div className={styles.emptyCard}>
            <h2 className={styles.emptyTitle}>No documents yet</h2>
            <p className={styles.emptyText}>
              Create an estimate for quotes or an invoice for billing. 
              Estimates can be converted to invoices when your client accepts.
            </p>

            <div className={styles.emptyActions}>
              <CreateInvoiceButton
                onCreated={handleInvoiceCreated}
                buttonText="Create Estimate"
                documentType="estimate"
                className={styles.secondaryButton}
              />
              <CreateInvoiceButton
                onCreated={handleInvoiceCreated}
                buttonText="Create Invoice"
                documentType="invoice"
                className={styles.primaryButton}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar: search */}
            <div className={styles.toolbarRow}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search estimates and invoices..."
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
                      <th className={styles.actionsHeader}>
                        <span className={styles.srOnly}>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {processed.pageItems.map((inv) => (
                      <tr
                        key={inv.id}
                        className={styles.tableRow}
                      >
                        <td className={styles.td}>
                          <div className={styles.invoiceNumberCell}>
                            <span className={inv.document_type === "estimate" ? styles.docTypeBadgeEstimate : styles.docTypeBadgeInvoice}>
                              {inv.document_type === "estimate" ? "EST" : "INV"}
                            </span>
                            <span>{inv.invoice_number || "—"}</span>
                          </div>
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
                          <span className={`${styles.statusBadge} ${getStatusBadgeClass(inv.status)}`}>
                            {inv.status || "draft"}
                          </span>
                        </td>
                        <td className={styles.tdActions}>
                          <button
                            className={styles.editButton}
                            onClick={() => handleEditInvoice(inv)}
                            title={`Edit ${inv.document_type === "estimate" ? "estimate" : "invoice"}`}
                            aria-label={`Edit ${inv.invoice_number}`}
                          >
                            {/* Pen/Edit SVG icon */}
                            <svg
                              className={styles.editIcon}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                          </button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => handleDeleteClick(inv)}
                            title={`Delete ${inv.document_type === "estimate" ? "estimate" : "invoice"}`}
                            aria-label={`Delete ${inv.invoice_number}`}
                          >
                            {/* Trash/Delete SVG icon */}
                            <svg
                              className={styles.deleteIcon}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
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
      </OnboardingGate>

      {/* Add New Service modal */}
      <AddServiceModal
        open={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
      />

      {/* Edit Invoice modal - only rendered when an invoice is selected */}
      {selectedInvoice && (
        <InvoiceModal
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSaved={handleInvoiceSaved}
          invoice={selectedInvoice}
        />
      )}
    </div>
    </>
  );
}
