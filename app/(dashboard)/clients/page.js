"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import AddClientForm from "@/components/clients/AddClientForm";
import { FiEdit2 } from "react-icons/fi";
import styles from "./clientsPage.module.css";
import ClientUploadModal from "@/components/clients/clientupload/page";

export default function ClientsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("created_at"); // "name" | "contact" | "service_city" | "created_at"
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" | "desc"
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // default desktop
  const [showUpload, setShowUpload] = useState(false);


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

  useEffect(() => {
    function updatePageSize() {
      // match your CSS breakpoint (640px)
      const isMobile = window.matchMedia("(max-width: 640px)").matches;
      setPageSize(isMobile ? 8 : 10);
    }

    updatePageSize(); // run on mount

    const mq = window.matchMedia("(max-width: 640px)");

    // Listen for changes (orientation change / resize)
    if (mq.addEventListener) {
      mq.addEventListener("change", updatePageSize);
    } else {
      // Safari fallback
      mq.addListener(updatePageSize);
    }

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", updatePageSize);
      } else {
        mq.removeListener(updatePageSize);
      }
    };
  }, []);

  useEffect(() => {
  setCurrentPage(1);
}, [pageSize]);


  // Fetch clients
  useEffect(() => {
    if (!userId) return;

    async function fetchClients() {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setClients(data);
      } else {
        console.error("Error loading clients:", error);
      }
    }

    fetchClients();
  }, [userId]);

  // Reset page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortField, sortDirection]);

  function handleClientCreated(newClient) {
    setClients((prev) => [newClient, ...prev]);
    setShowForm(false);
    setEditingClient(null);
    setCurrentPage(1);
  }

  function handleClientUpdated(updatedClient) {
    setClients((prev) =>
      prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
    );
    setShowForm(false);
    setEditingClient(null);
  }

  function handleClientDeleted(deletedId) {
    setClients((prev) => prev.filter((c) => c.id !== deletedId));
    setShowForm(false);
    setEditingClient(null);
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      // default directions
      setSortDirection(field === "created_at" ? "desc" : "asc");
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

  const processed = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // 1) Filter
    let filtered = clients;
    if (term) {
      filtered = clients.filter((c) => {
        const values = [
          c.name,
          c.email,
          c.phone,
          c.service_address_line1,
          c.service_address_line2,
          c.service_city,
          c.service_state,
          c.service_postal_code,
          c.billing_address_line1,
          c.billing_address_line2,
          c.billing_city,
          c.billing_state,
          c.billing_postal_code,
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

      if (sortField === "name") {
        return stringCompare(a.name, b.name);
      }

      if (sortField === "contact") {
        const aContact = a.email || a.phone || "";
        const bContact = b.email || b.phone || "";
        return stringCompare(aContact, bContact);
      }

      if (sortField === "service_city") {
        return stringCompare(a.service_city, b.service_city);
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

    return {
      filteredCount: filtered.length,
      totalItems,
      totalPages,
      page,
      startIndex,
      pageItems,
    };
  }, [clients, searchTerm, sortField, sortDirection, currentPage, pageSize]);

  const hasClients = clients.length > 0;

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
  <div className={styles.pageWrapper}>
    <DashboardNavbar />

    <main className={styles.main}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Clients</h1>
          <p className={styles.subtitle}>Manage your customers</p>
        </div>

        {hasClients && !showForm && (
          <div className={styles.headerButtons}>
            <button
              className={styles.uaddButton}
              onClick={() => setShowUpload(true)}
            >
              Import Clients
            </button>

            <button
              className={styles.addButton}
              onClick={() => {
                setEditingClient(null);
                setShowForm(true);
              }}
            >
              Add Client
            </button>
          </div>
        )}
      </div>

      {/* Form (create or edit) */}
      {showForm && (
        <div className={styles.formWrapper}>
          <AddClientForm
            ownerId={userId}
            mode={editingClient ? "edit" : "create"}
            client={editingClient}
            onCreated={handleClientCreated}
            onUpdated={handleClientUpdated}
            onDeleted={handleClientDeleted}
            onCancel={() => {
              setShowForm(false);
              setEditingClient(null);
            }}
          />
        </div>
      )}

      {/* Content */}
      {!hasClients ? (
        // Empty state
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>No Clients Yet</div>
          <p className={styles.emptyMessage}>
            Add your first client to start sending invoices.
          </p>

          <div className={styles.headerButtons}>
            <button
              className={styles.uaddButton}
              onClick={() => setShowUpload(true)}
            >
              Import Clients
            </button>

            {!showForm && (
              <button
                className={styles.addFirstButton}
                onClick={() => {
                  setEditingClient(null);
                  setShowForm(true);
                }}
              >
                Add Your First Client
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar: search */}
          <div className={styles.toolbarRow}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search clients (name, email, address...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {processed.totalItems === 0 ? (
            <div className={styles.noResultsBox}>
              <p className={styles.noResultsText}>
                No clients match your search.
              </p>
            </div>
          ) : (
            <>
              {/* Table */}
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th
                      className={`${styles.sortableHeader} ${styles.colName}`}
                      onClick={() => handleSort("name")}
                    >
                      <div className={styles.headerInner}>
                        <span>Name</span>
                        {renderSortIcon("name")}
                      </div>
                    </th>

                    <th
                      className={`${styles.sortableHeader} ${styles.colContact}`}
                      onClick={() => handleSort("contact")}
                    >
                      <div className={styles.headerInner}>
                        <span>Contact</span>
                        {renderSortIcon("contact")}
                      </div>
                    </th>

                    <th
                      className={`${styles.sortableHeader} ${styles.colLocation}`}
                      onClick={() => handleSort("service_city")}
                    >
                      <div className={styles.headerInner}>
                        <span>Location</span>
                        {renderSortIcon("service_city")}
                      </div>
                    </th>

                    <th
                      className={`${styles.sortableHeader} ${styles.colCreated}`}
                      onClick={() => handleSort("created_at")}
                    >
                      <div className={styles.headerInner}>
                        <span>Created</span>
                        {renderSortIcon("created_at")}
                      </div>
                    </th>

                    <th
                      className={`${styles.actionsHeader} ${styles.colActions}`}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {processed.pageItems.map((client) => (
                    <tr key={client.id}>
                      <td className={styles.colName}>{client.name}</td>

                      <td className={styles.colContact}>
                        {client.email}
                        <br />
                        <span className={styles.phone}>{client.phone}</span>
                      </td>

                      <td className={styles.colLocation}>
                        {client.service_city || "-"}
                      </td>

                      <td className={styles.colCreated}>
                        {client.created_at
                          ? new Date(client.created_at).toLocaleDateString()
                          : "-"}
                      </td>

                      <td
                        className={`${styles.actionsCell} ${styles.colActions}`}
                      >
                        <button
                          className={styles.iconButton}
                          onClick={() => {
                            setEditingClient(client);
                            setShowForm(true);
                          }}
                          aria-label={`Edit ${client.name}`}
                        >
                          <FiEdit2 className={styles.icon} />
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
                      Showing {processed.startIndex + 1}–
                      {Math.min(
                        processed.startIndex + pageSize,
                        processed.totalItems
                      )}{" "}
                      of {processed.totalItems} clients
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

    {/*Render the modal once, at the page root level */}
    <ClientUploadModal
      open={showUpload}
      onClose={() => setShowUpload(false)}
      ownerId={userId}
      existingClients={clients}
      onImported={(inserted) => {
        if (inserted?.length) {
          setClients((prev) => [...inserted, ...prev]);
          setCurrentPage(1);
        }
        setShowUpload(false);
      }}
    />
  </div>
);
}