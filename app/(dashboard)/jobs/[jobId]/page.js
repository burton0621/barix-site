"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardNavbar from "@/components/Navbar/DashboardNav/DashboardNavbar";
import InvoiceModal from "@/components/Invoices/InvoiceModal/InvoiceModal";
import styles from "./jobDetailPage.module.css";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const jobId = params?.jobId;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [photos, setPhotos] = useState([]);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceModalType, setInvoiceModalType] = useState("invoice");

  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    loadJob();
  }, [jobId]);

  useEffect(() => {
    const createType = searchParams.get("create");
    const tab = searchParams.get("tab");

    if (createType === "invoice" || createType === "estimate") {
      setInvoiceModalType(createType);
      setShowInvoiceModal(true);
    }

    if (tab === "notes") {
      setTimeout(() => {
        document.getElementById("job-notes-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }

    if (tab === "photos") {
      setTimeout(() => {
        document.getElementById("job-photos-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [searchParams]);

  async function loadJob() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      router.push("/login");
      return;
    }

    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("owner_id", currentUserId)
      .single();

    if (jobError || !jobData) {
      console.error("Error loading job:", jobError);
      router.push("/dashboard/jobs");
      return;
    }

    setJob(jobData);

    const [clientRes, docsRes, notesRes, photosRes] = await Promise.all([
      supabase.from("clients").select("id, name, email, phone").eq("id", jobData.client_id).single(),
      supabase
        .from("invoices")
        .select("id, invoice_number, document_type, status, total, issue_date, due_date, created_at, converted_from_id")
        .eq("job_id", jobData.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("job_notes")
        .select("*")
        .eq("job_id", jobData.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("job_photos")
        .select("*")
        .eq("job_id", jobData.id)
        .order("created_at", { ascending: false }),
    ]);

    if (clientRes.error) console.error("Error loading client:", clientRes.error);
    if (docsRes.error) console.error("Error loading documents:", docsRes.error);
    if (notesRes.error) console.error("Error loading notes:", notesRes.error);
    if (photosRes.error) console.error("Error loading photos:", photosRes.error);

    setClient(clientRes.data || null);
    setDocuments(docsRes.data || []);
    setNotes(notesRes.data || []);
    setPhotos(photosRes.data || []);
    setLoading(false);
  }

  const invoices = useMemo(
    () => documents.filter((doc) => doc.document_type === "invoice"),
    [documents]
  );

  const estimates = useMemo(
    () => documents.filter((doc) => doc.document_type === "estimate"),
    [documents]
  );

  const dedupedTotal = useMemo(() => {
    const convertedEstimateIds = new Set(
      invoices.map((invoice) => invoice.converted_from_id).filter(Boolean)
    );

    const estimateTotal = estimates.reduce((sum, estimate) => {
      if (convertedEstimateIds.has(estimate.id)) return sum;
      return sum + Number(estimate.total || 0);
    }, 0);

    const invoiceTotal = invoices.reduce((sum, invoice) => {
      return sum + Number(invoice.total || 0);
    }, 0);

    return invoiceTotal + estimateTotal;
  }, [invoices, estimates]);

  async function handleAddNote() {
    if (!newNote.trim() || !job) return;

    setSavingNote(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const currentUserId = session?.user?.id;

    const { error } = await supabase.from("job_notes").insert([
      {
        job_id: job.id,
        owner_id: currentUserId,
        note: newNote.trim(),
      },
    ]);

    if (error) {
      console.error("Error adding note:", error);
      setSavingNote(false);
      return;
    }

    await touchJobActivity(job.id);
    setNewNote("");
    setSavingNote(false);
    loadJob();
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !job) return;

    setUploadingPhoto(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const currentUserId = session?.user?.id;
    const fileExt = file.name.split(".").pop();
    const fileName = `${job.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("job-photos")
      .upload(fileName, file, { upsert: false });

    if (uploadError) {
      console.error("Error uploading photo:", uploadError);
      setUploadingPhoto(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("job-photos")
      .getPublicUrl(fileName);

    const { error: insertError } = await supabase.from("job_photos").insert([
      {
        job_id: job.id,
        owner_id: currentUserId,
        file_name: file.name,
        file_path: fileName,
        public_url: publicUrlData?.publicUrl || null,
      },
    ]);

    if (insertError) {
      console.error("Error saving photo record:", insertError);
      setUploadingPhoto(false);
      return;
    }

    await touchJobActivity(job.id);
    setUploadingPhoto(false);
    loadJob();
  }

  async function touchJobActivity(currentJobId) {
    await supabase
      .from("jobs")
      .update({
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", currentJobId);
  }

  function handleOpenCreateEstimate() {
    setInvoiceModalType("estimate");
    setShowInvoiceModal(true);
  }

  function handleOpenCreateInvoice() {
    setInvoiceModalType("invoice");
    setShowInvoiceModal(true);
  }

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <p className={styles.loadingText}>Loading job...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <DashboardNavbar />

      <main className={styles.main}>
        <section className={styles.headerCard}>
          <div>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => router.push("/dashboard/jobs")}
            >
              Back to Jobs
            </button>

            <h1 className={styles.title}>{job?.title || "Untitled Job"}</h1>
            <p className={styles.subtitle}>
              {client?.name || "Unknown Client"}
              {job?.job_number ? ` • #${job.job_number}` : ""}
            </p>
          </div>

          <div className={styles.headerActions}>
            <button type="button" className={styles.secondaryBtn} onClick={handleOpenCreateEstimate}>
              Create Estimate
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={handleOpenCreateInvoice}>
              Create Invoice
            </button>
            <label className={styles.secondaryBtn}>
              {uploadingPhoto ? "Uploading..." : "Upload Photo"}
              <input
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
            </label>
          </div>
        </section>

        <section className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Status</span>
            <span className={styles.summaryValue}>{formatStatus(job?.status)}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Estimates</span>
            <span className={styles.summaryValue}>{estimates.length}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Invoices</span>
            <span className={styles.summaryValue}>{invoices.length}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Photos</span>
            <span className={styles.summaryValue}>{photos.length}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Notes</span>
            <span className={styles.summaryValue}>{notes.length}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Total</span>
            <span className={styles.summaryValue}>{formatCurrency(dedupedTotal)}</span>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Documents</h2>
          </div>

          <div className={styles.docsGrid}>
            <div className={styles.docsCard}>
              <h3 className={styles.cardTitle}>Estimates</h3>
              {estimates.length === 0 ? (
                <p className={styles.emptyText}>No estimates yet.</p>
              ) : (
                <div className={styles.docList}>
                  {estimates.map((doc) => (
                    <div key={doc.id} className={styles.docRow}>
                      <div>
                        <p className={styles.docName}>{doc.invoice_number || "Estimate"}</p>
                        <p className={styles.docMeta}>
                          {formatDate(doc.issue_date || doc.created_at)} • {formatStatus(doc.status)}
                        </p>
                      </div>
                      <span className={styles.docAmount}>{formatCurrency(doc.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.docsCard}>
              <h3 className={styles.cardTitle}>Invoices</h3>
              {invoices.length === 0 ? (
                <p className={styles.emptyText}>No invoices yet.</p>
              ) : (
                <div className={styles.docList}>
                  {invoices.map((doc) => (
                    <div key={doc.id} className={styles.docRow}>
                      <div>
                        <p className={styles.docName}>{doc.invoice_number || "Invoice"}</p>
                        <p className={styles.docMeta}>
                          {formatDate(doc.issue_date || doc.created_at)} • {formatStatus(doc.status)}
                        </p>
                      </div>
                      <span className={styles.docAmount}>{formatCurrency(doc.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={styles.section} id="job-notes-section">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Notes</h2>
          </div>

          <div className={styles.notesCard}>
            <textarea
              className={styles.noteInput}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note for this job..."
              rows={4}
            />
            <div className={styles.noteActions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleAddNote}
                disabled={savingNote}
              >
                {savingNote ? "Saving..." : "Add Note"}
              </button>
            </div>

            <div className={styles.noteList}>
              {notes.length === 0 ? (
                <p className={styles.emptyText}>No notes yet.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className={styles.noteItem}>
                    <p className={styles.noteText}>{note.note}</p>
                    <p className={styles.noteMeta}>{formatDateTime(note.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className={styles.section} id="job-photos-section">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Photos</h2>
          </div>

          <div className={styles.photosCard}>
            {photos.length === 0 ? (
              <p className={styles.emptyText}>No photos uploaded yet.</p>
            ) : (
              <div className={styles.photoGrid}>
                {photos.map((photo) => (
                  <div key={photo.id} className={styles.photoItem}>
                    {photo.public_url ? (
                      <img
                        src={photo.public_url}
                        alt={photo.file_name || "Job photo"}
                        className={styles.photo}
                      />
                    ) : (
                      <div className={styles.photoFallback}>Photo</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {showInvoiceModal && job ? (
        <InvoiceModal
          open={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          onSaved={async () => {
            setShowInvoiceModal(false);
            await touchJobActivity(job.id);
            loadJob();
          }}
          documentType={invoiceModalType}
          jobId={job.id}
          clientId={job.client_id}
        />
      ) : null}
    </div>
  );
}

function formatStatus(status) {
  if (!status) return "Active";
  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}