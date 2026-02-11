"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import AddServiceModal from "@/components/Services/AddServiceModal";
import ConfirmDialog from "@/components/common/ConfirmDialog/ConfirmDialog";
import Toast from "@/components/common/Toast/Toast";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import styles from "./servicespage.module.css";

export default function ServicesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const [services, setServices] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState(null); // null | "delete"
  const [pendingDeleteService, setPendingDeleteService] = useState(null);

  // Toast notification
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });
  const showToast = (message, type = "error") => setToast({ open: true, message, type });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("created_at"); // "name" | "rate" | "created_at"
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" | "desc"
  const [currentPage, setCurrentPage] = useState(1);

  //Responsive page size: 7 mobile, 15 desktop
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setPageSize(mq.matches ? 7 : 15);
    apply();

    if (mq.addEventListener) mq.addEventListener("change", apply);
    else mq.addListener(apply);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      else mq.removeListener(apply);
    };
  }, []);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  // Fetch services
  useEffect(() => {
    if (!userId) return;

    async function fetchServices() {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) setServices(data);
      else console.error("Error loading services:", error);
    }

    fetchServices();
  }, [userId]);

  // Reset page when search/sort/pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection, pageSize]);

  function openCreateModal() {
    setEditingService(null);
    setModalOpen(true);
  }

  function openEditModal(service) {
    setEditingService(service);
    setModalOpen(true);
  }

  function handleServiceCreated(newService) {
    if (!newService) return;
    setServices((prev) => [newService, ...prev]);
    setCurrentPage(1);
  }

  function handleServiceUpdated(updatedService) {
    if (!updatedService) return;
    setServices((prev) => prev.map((s) => (s.id === updatedService.id ? updatedService : s)));
  }

  function handleServiceDeleted(deletedId) {
    setServices((prev) => prev.filter((s) => s.id !== deletedId));
  }

  function requestDelete(service) {
    setPendingDeleteService(service);
    setConfirmAction("delete");
  }

  async function handleDeleteConfirm() {
    if (!pendingDeleteService) return;

    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;

      if (!uid) {
        router.push("/login");
        return;
      }

      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", pendingDeleteService.id)
        .eq("owner_id", uid);

      if (error) {
        console.error("Delete error:", error);
        showToast(`Error deleting service: ${error.message}`);
        return;
      }

      handleServiceDeleted(pendingDeleteService.id);
      setPendingDeleteService(null);
    } catch (err) {
      console.error("Unexpected delete error:", err);
      showToast(`Unexpected error deleting service: ${err?.message ? err.message : String(err)}`);
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "created_at" ? "desc" : "asc");
    }
  }

  function renderSortIcon(field) {
    if (sortField !== field) return <span className={styles.sortIcon}>↕</span>;
    return (
      <span className={`${styles.sortIcon} ${styles.sortIconActive}`}>
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  }

  const processed = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // 1) Filter
    let filtered = services;
    if (term) {
      filtered = services.filter((s) => {
        const values = [s.name, s.description, s.default_rate];
        return values.some((v) => v && String(v).toLowerCase().includes(term));
      });
    }

    // 2) Sort
    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;

      const stringCompare = (x, y) =>
        String(x || "").localeCompare(String(y || ""), undefined, {
          sensitivity: "base",
        }) * dir;

      if (sortField === "name") return stringCompare(a.name, b.name);

      if (sortField === "rate") {
        const aRate = typeof a.default_rate === "number" ? a.default_rate : parseFloat(a.default_rate || "0") || 0;
        const bRate = typeof b.default_rate === "number" ? b.default_rate : parseFloat(b.default_rate || "0") || 0;
        return (aRate - bRate) * dir;
      }

      if (sortField === "created_at") {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return (aTime - bTime) * dir;
      }

      return 0;
    });

    // 3) Pagination
    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(currentPage, totalPages);
    const startIndex = (page - 1) * pageSize;
    const pageItems = sorted.slice(startIndex, startIndex + pageSize);

    return { totalItems, totalPages, page, startIndex, pageItems };
  }, [services, searchTerm, sortField, sortDirection, currentPage, pageSize]);

  const hasServices = services.length > 0;

  const formatRate = (rate) => {
    const n = typeof rate === "number" ? rate : parseFloat(rate || "");
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
  };

  // page number buttons that fit better on mobile
  const pageButtons = useMemo(() => {
    const total = processed.totalPages;
    const current = processed.page;
    const maxButtons = 5;

    if (total <= maxButtons) return Array.from({ length: total }, (_, i) => i + 1);

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);

    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [processed.totalPages, processed.page]);

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />

      <div className={styles.pageWrapper}>
        <DashboardNavbar />

        <main className={styles.main}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Services</h1>
              <p className={styles.subtitle}>Manage your service catalog</p>
            </div>

            {hasServices && (
              <button className={styles.addButton} onClick={openCreateModal}>
                Add Service
              </button>
            )}
          </div>

          {!hasServices ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>No Services Yet</div>
              <p className={styles.emptyMessage}>
                Add your first service to quickly build invoices.
              </p>
              <button className={styles.addFirstButton} onClick={openCreateModal}>
                Add Your First Service
              </button>
            </div>
          ) : (
            <>
              <div className={styles.toolbarRow}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search services (name, description, rate...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {processed.totalItems === 0 ? (
                <div className={styles.noResultsBox}>
                  <p className={styles.noResultsText}>No services match your search.</p>
                </div>
              ) : (
                <>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th
                          className={styles.sortableHeader}
                          onClick={() => handleSort("name")}
                        >
                          <div className={styles.headerInner}>
                            <span>Name</span>
                            {renderSortIcon("name")}
                          </div>
                        </th>

                        {/* hidden on mobile */}
                        <th className={`${styles.descriptionHeader} ${styles.hideOnMobile}`}>
                          Description
                        </th>

                        <th
                          className={styles.sortableHeader}
                          onClick={() => handleSort("rate")}
                        >
                          <div className={styles.headerInner}>
                            <span>Rate</span>
                            {renderSortIcon("rate")}
                          </div>
                        </th>

                        {/*hidden on mobile */}
                        <th
                          className={`${styles.sortableHeader} ${styles.hideOnMobile}`}
                          onClick={() => handleSort("created_at")}
                        >
                          <div className={styles.headerInner}>
                            <span>Created</span>
                            {renderSortIcon("created_at")}
                          </div>
                        </th>

                        <th className={styles.actionsHeader}>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {processed.pageItems.map((service) => (
                        <tr key={service.id}>
                          <td className={styles.nameCell}>{service.name}</td>

                          {/*hidden on mobile */}
                          <td className={`${styles.descriptionCell} ${styles.hideOnMobile}`}>
                            {service.description || "-"}
                          </td>

                          <td className={styles.rateCell}>{formatRate(service.default_rate)}</td>

                          {/*hidden on mobile */}
                          <td className={styles.hideOnMobile}>
                            {service.created_at
                              ? new Date(service.created_at).toLocaleDateString()
                              : "-"}
                          </td>

                          <td className={styles.actionsCell}>
                            <div className={styles.actionsInline}>
                              <button
                                className={styles.iconButton}
                                onClick={() => openEditModal(service)}
                                aria-label={`Edit ${service.name}`}
                                title="Edit"
                              >
                                <FiEdit2 className={styles.icon} />
                              </button>

                              <button
                                className={`${styles.iconButton} ${styles.dangerIconButton}`}
                                onClick={() => requestDelete(service)}
                                aria-label={`Delete ${service.name}`}
                                title="Delete"
                              >
                                <FiTrash2 className={styles.icon} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className={styles.paginationRow}>
                    <div className={styles.pageInfo}>
                      {processed.totalItems > 0 && (
                        <>
                          Showing {processed.startIndex + 1}–
                          {Math.min(processed.startIndex + pageSize, processed.totalItems)} of{" "}
                          {processed.totalItems} services
                        </>
                      )}
                    </div>

                    <div className={styles.pageControls}>
                      <button
                        className={styles.pageButton}
                        disabled={processed.page === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>

                      {pageButtons.map((page) => (
                        <button
                          key={page}
                          className={page === processed.page ? styles.pageButtonActive : styles.pageButton}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        className={styles.pageButton}
                        disabled={processed.page === processed.totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(processed.totalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <AddServiceModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            service={editingService}
            onCreated={handleServiceCreated}
            onUpdated={handleServiceUpdated}
            onDeleted={(id) => handleServiceDeleted(id)}
          />

          {confirmAction === "delete" && (
            <ConfirmDialog
              open={true}
              title="Delete Service"
              message="Are you sure you want to delete this service? This action cannot be undone."
              confirmLabel="Yes, Delete"
              confirmType="danger"
              onConfirm={() => {
                setConfirmAction(null);
                handleDeleteConfirm();
              }}
              onCancel={() => {
                setConfirmAction(null);
                setPendingDeleteService(null);
              }}
            />
          )}
        </main>
      </div>
    </>
  );
}
