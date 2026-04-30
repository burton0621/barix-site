"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardNavbar from "@/components/Navbar/DashboardNav/DashboardNavbar";
import InvoiceModal from "@/components/Invoices/InvoiceModal/InvoiceModal";
import styles from "./jobDetailPage.module.css";
import { FiTrash2, FiEdit2 } from "react-icons/fi";

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
  const [selectedDocument, setSelectedDocument] = useState(null);

  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);

  useEffect(() => {
    if (!jobId) return;
    loadJob();
  }, [jobId]);

  useEffect(() => {
    const createType = searchParams.get("create");
    const tab = searchParams.get("tab");

    if (createType === "invoice" || createType === "estimate") {
      setSelectedDocument(null);
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

  useEffect(() => {
    function handleKeyDown(e) {
      if (selectedPhotoIndex === null) return;

      if (e.key === "Escape") {
        setSelectedPhotoIndex(null);
      } else if (e.key === "ArrowLeft") {
        showPrevPhoto();
      } else if (e.key === "ArrowRight") {
        showNextPhoto();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhotoIndex, photos]);

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
      router.push("/jobs");
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

    const normalizedPhotos = (photosRes.data || []).map((photo) => {
      let resolvedUrl = photo.public_url || null;

      if (!resolvedUrl && photo.file_path) {
        const { data } = supabase.storage
          .from("job-photos")
          .getPublicUrl(photo.file_path);

        resolvedUrl = data?.publicUrl || null;
      }

      return {
        ...photo,
        resolvedUrl,
      };
    });

    setClient(clientRes.data || null);
    setDocuments(docsRes.data || []);
    setNotes(notesRes.data || []);
    setPhotos(normalizedPhotos);
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

  const selectedPhoto =
    selectedPhotoIndex !== null && photos[selectedPhotoIndex]
      ? photos[selectedPhotoIndex]
      : null;

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
    const safeName = file.name.replace(/\s+/g, "-");
    const fileName = `${job.id}/${Date.now()}-${safeName || `photo.${fileExt}`}`;

    const { error: uploadError } = await supabase.storage
      .from("job-photos")
      .upload(fileName, file, { upsert: false });

    if (uploadError) {
      console.error("Error uploading photo:", uploadError);
      setUploadingPhoto(false);
      e.target.value = "";
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
      e.target.value = "";
      return;
    }

    await touchJobActivity(job.id);
    setUploadingPhoto(false);
    e.target.value = "";
    loadJob();
  }

  async function handleDeletePhoto(photoId) {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    const confirmed = window.confirm("Delete this photo?");
    if (!confirmed) return;

    setDeletingPhotoId(photoId);

    try {
      if (photo.file_path) {
        const { error: storageError } = await supabase.storage
          .from("job-photos")
          .remove([photo.file_path]);

        if (storageError) {
          console.error("Error deleting photo from storage:", storageError);
          setDeletingPhotoId(null);
          return;
        }
      }

      const { error: dbError } = await supabase
        .from("job_photos")
        .delete()
        .eq("id", photoId);

      if (dbError) {
        console.error("Error deleting photo record:", dbError);
        setDeletingPhotoId(null);
        return;
      }

      await touchJobActivity(job.id);

      if (selectedPhotoIndex !== null) {
        const newPhotos = photos.filter((p) => p.id !== photoId);

        if (newPhotos.length === 0) {
          setSelectedPhotoIndex(null);
        } else {
          const deletedIndex = photos.findIndex((p) => p.id === photoId);

          if (deletedIndex === selectedPhotoIndex) {
            setSelectedPhotoIndex(0);
          } else if (deletedIndex < selectedPhotoIndex) {
            setSelectedPhotoIndex((prev) => Math.max(0, prev - 1));
          }
        }
      }

      await loadJob();
    } catch (err) {
      console.error("Unexpected error deleting photo:", err);
    } finally {
      setDeletingPhotoId(null);
    }
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
    setSelectedDocument(null);
    setInvoiceModalType("estimate");
    setShowInvoiceModal(true);
  }

  function handleOpenCreateInvoice() {
    setSelectedDocument(null);
    setInvoiceModalType("invoice");
    setShowInvoiceModal(true);
  }

  function handleEditDocument(doc) {
    setSelectedDocument(doc);
    setInvoiceModalType(doc.document_type || "invoice");
    setShowInvoiceModal(true);
  }

  function handleCloseInvoiceModal() {
    setShowInvoiceModal(false);
    setSelectedDocument(null);
  }

  function openPhotoGallery(index) {
    setSelectedPhotoIndex(index);
  }

  function closePhotoGallery() {
    setSelectedPhotoIndex(null);
  }

  function showPrevPhoto() {
    if (!photos.length) return;
    setSelectedPhotoIndex((prev) => {
      if (prev === null) return 0;
      return prev === 0 ? photos.length - 1 : prev - 1;
    });
  }

  function showNextPhoto() {
    if (!photos.length) return;
    setSelectedPhotoIndex((prev) => {
      if (prev === null) return 0;
      return prev === photos.length - 1 ? 0 : prev + 1;
    });
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
              onClick={() => router.push("jobs")}
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
                      <div className={styles.docMain}>
                        <div>
                          <p className={styles.docName}>{doc.invoice_number || "Estimate"}</p>
                          <p className={styles.docMeta}>
                            {formatDate(doc.issue_date || doc.created_at)} • {formatStatus(doc.status)}
                          </p>
                        </div>
                      </div>

                      <div className={styles.docActions}>
                        <span className={styles.docAmount}>{formatCurrency(doc.total)}</span>
                        <button
                          type="button"
                          className={styles.docEditButton}
                          onClick={() => handleEditDocument(doc)}
                          aria-label={`Edit ${doc.invoice_number || "estimate"}`}
                          title="Edit estimate"
                        >
                          <FiEdit2 />
                        </button>
                      </div>
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
                      <div className={styles.docMain}>
                        <div>
                          <p className={styles.docName}>{doc.invoice_number || "Invoice"}</p>
                          <p className={styles.docMeta}>
                            {formatDate(doc.issue_date || doc.created_at)} • {formatStatus(doc.status)}
                          </p>
                        </div>
                      </div>

                      <div className={styles.docActions}>
                        <span className={styles.docAmount}>{formatCurrency(doc.total)}</span>
                        <button
                          type="button"
                          className={styles.docEditButton}
                          onClick={() => handleEditDocument(doc)}
                          aria-label={`Edit ${doc.invoice_number || "invoice"}`}
                          title="Edit invoice"
                        >
                          <FiEdit2 />
                        </button>
                      </div>
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
                {photos.map((photo, index) => (
                  <div key={photo.id} className={styles.photoTile}>
                    <button
                      type="button"
                      className={styles.photoItemButton}
                      onClick={() => openPhotoGallery(index)}
                    >
                      <div className={styles.photoItem}>
                        {photo.resolvedUrl ? (
                          <img
                            src={photo.resolvedUrl}
                            alt={photo.file_name || "Job photo"}
                            className={styles.photo}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.photoFallback}>Photo unavailable</div>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      className={styles.photoDeleteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(photo.id);
                      }}
                      disabled={deletingPhotoId === photo.id}
                      aria-label="Delete photo"
                      title="Delete photo"
                    >
                      {deletingPhotoId === photo.id ? "…" : <FiTrash2 />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.photoActions}>
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
          </div>
        </section>
      </main>

      {selectedPhoto ? (
        <div
          className={styles.galleryOverlay}
          onClick={closePhotoGallery}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.galleryContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.galleryClose}
              onClick={closePhotoGallery}
              aria-label="Close photo gallery"
            >
              ×
            </button>

            {photos.length > 1 ? (
              <button
                type="button"
                className={`${styles.galleryArrow} ${styles.galleryArrowLeft}`}
                onClick={showPrevPhoto}
                aria-label="Previous photo"
              >
                ‹
              </button>
            ) : null}

            <div className={styles.galleryImageWrap}>
              <img
                src={selectedPhoto.resolvedUrl}
                alt={selectedPhoto.file_name || "Job photo"}
                className={styles.galleryImage}
              />
              <div className={styles.galleryMeta}>
                <span className={styles.galleryCounter}>
                  {selectedPhotoIndex + 1} / {photos.length}
                </span>
                <span className={styles.galleryFileName}>
                  {selectedPhoto.file_name || "Photo"}
                </span>
              </div>
            </div>

            {photos.length > 1 ? (
              <button
                type="button"
                className={`${styles.galleryArrow} ${styles.galleryArrowRight}`}
                onClick={showNextPhoto}
                aria-label="Next photo"
              >
                ›
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showInvoiceModal && job ? (
        <InvoiceModal
          open={showInvoiceModal}
          onClose={handleCloseInvoiceModal}
          onSaved={async () => {
            setShowInvoiceModal(false);
            setSelectedDocument(null);
            await touchJobActivity(job.id);
            await loadJob();
          }}
          documentType={selectedDocument?.document_type || invoiceModalType}
          invoice={selectedDocument || null}
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