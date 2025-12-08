"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import { FiEdit } from "react-icons/fi";

import AddClientForm from "@/components/clients/AddClientForm";
import styles from "./ClientsPage.module.css";

export default function ClientsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

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
    if (!userId) return;

    async function fetchClients() {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      setClients(data || []);
    }

    fetchClients();
  }, [userId]);

  function handleClientCreated(newClient) {
    setClients((prev) => [newClient, ...prev]);
    setShowForm(false);
  }

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  const hasClients = clients.length > 0;

  return (
    <div className={styles.pageWrapper}>
      <DashboardNavbar />

      <main className={styles.main}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Clients</h1>
            <p className={styles.subtitle}>Manage your customers</p>
          </div>

          {hasClients && !showForm && (
            <button 
              className={styles.addButton}
              onClick={() => {
                setEditingClient(null);
                setShowForm(true);
              }}>
                Add Client
            </button>
          )}
        </div>

        {showForm && (
          <div className={styles.formWrapper}>
            <AddClientForm
              ownerId={userId}
              mode={editingClient ? "edit" : "create"}
              client={editingClient}
              onCreated={handleClientCreated}
              onUpdated={(updatedClient) => {
                setClients((prev) =>
                  prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
                );
                setShowForm(false);
                setEditingClient(null);
              }}
              onDeleted={(deletedId) => {
                setClients((prev) => prev.filter((c) => c.id !== deletedId));
                setShowForm(false);
                setEditingClient(null);
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingClient(null);
              }}
            />
          </div>
        )}

        {!hasClients ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>No Clients Yet</h2>
            <p className={styles.emptyMessage}>
              Add your first client to start sending invoices.
            </p>
            <button 
              className={styles.addFirstButton} 
              onClick={() => {
                setEditingClient(null);
                setShowForm(true);
              }}> 
              Add Your First Client
            </button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Service City</th>
                <th>Created</th>
                <th className={styles.actionsHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>
                    {client.email}
                    <br />
                    <span className={styles.phone}>{client.phone}</span>
                  </td>
                  <td>{client.service_city || "-"}</td>
                  <td>{new Date(client.created_at).toLocaleDateString()}</td>
                  <td className={styles.actionsCell}>
                    <button
                      className={styles.iconButton}
                      onClick={() => {
                        setEditingClient(client);
                        setShowForm(true);
                      }}
                      aria-label={`Edit ${client.name}`}
                    >
                      {/* Pencil icon SVG */}
                      <FiEdit className={styles.icon}/> 
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
