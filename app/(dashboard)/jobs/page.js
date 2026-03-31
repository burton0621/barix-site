"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardNavbar from "@/components/Navbar/DashboardNav/DashboardNavbar";
import CreateJobModal from "@/components/jobs/CreateJobModal/CreateJobModal";
import JobsFilters from "@/components/jobs/JobsFilters/JobsFilters";
import JobCard from "@/components/jobs/JobCard/JobCard";
import styles from "./jobsPage.module.css";

export default function JobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const [jobs, setJobs] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [jobDocsMap, setJobDocsMap] = useState({});
  const [jobNotesCountMap, setJobNotesCountMap] = useState({});
  const [jobPhotosCountMap, setJobPhotosCountMap] = useState({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadJobsPage = useCallback(async () => {
    setLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      router.push("/login");
      return;
    }

    const currentUserId = session.user.id;
    setUserId(currentUserId);

    const { data: jobsData, error: jobsError } = await supabase
      .from("jobs")
      .select("*")
      .eq("owner_id", currentUserId)
      .eq("archived", false)
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (jobsError) {
      console.error("Error loading jobs:", jobsError);
      setJobs([]);
      setLoading(false);
      return;
    }

    const safeJobs = jobsData || [];
    setJobs(safeJobs);

    if (safeJobs.length === 0) {
      setClientsMap({});
      setJobDocsMap({});
      setJobNotesCountMap({});
      setJobPhotosCountMap({});
      setLoading(false);
      return;
    }

    const clientIds = [...new Set(safeJobs.map((j) => j.client_id).filter(Boolean))];
    const jobIds = safeJobs.map((j) => j.id);

    const [
      clientsRes,
      docsRes,
      notesRes,
      photosRes,
    ] = await Promise.all([
      clientIds.length
        ? supabase
            .from("clients")
            .select("id, name")
            .in("id", clientIds)
        : Promise.resolve({ data: [], error: null }),

      supabase
        .from("invoices")
        .select("id, job_id, document_type, total, converted_from_id, updated_at, created_at, status")
        .in("job_id", jobIds),

      supabase
        .from("job_notes")
        .select("id, job_id, created_at, updated_at")
        .in("job_id", jobIds),

      supabase
        .from("job_photos")
        .select("id, job_id, created_at")
        .in("job_id", jobIds),
    ]);

    if (clientsRes.error) {
      console.error("Error loading clients:", clientsRes.error);
    }
    if (docsRes.error) {
      console.error("Error loading job docs:", docsRes.error);
    }
    if (notesRes.error) {
      console.error("Error loading job notes:", notesRes.error);
    }
    if (photosRes.error) {
      console.error("Error loading job photos:", photosRes.error);
    }

    const nextClientsMap = {};
    for (const client of clientsRes.data || []) {
      nextClientsMap[client.id] = client;
    }

    const nextJobDocsMap = {};
    for (const doc of docsRes.data || []) {
      if (!doc.job_id) continue;
      if (!nextJobDocsMap[doc.job_id]) nextJobDocsMap[doc.job_id] = [];
      nextJobDocsMap[doc.job_id].push(doc);
    }

    const nextNotesCountMap = {};
    for (const note of notesRes.data || []) {
      nextNotesCountMap[note.job_id] = (nextNotesCountMap[note.job_id] || 0) + 1;
    }

    const nextPhotosCountMap = {};
    for (const photo of photosRes.data || []) {
      nextPhotosCountMap[photo.job_id] = (nextPhotosCountMap[photo.job_id] || 0) + 1;
    }

    setClientsMap(nextClientsMap);
    setJobDocsMap(nextJobDocsMap);
    setJobNotesCountMap(nextNotesCountMap);
    setJobPhotosCountMap(nextPhotosCountMap);

    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadJobsPage();
  }, [loadJobsPage]);

  const enrichedJobs = useMemo(() => {
    return jobs.map((job) => {
      const client = clientsMap[job.client_id] || null;
      const docs = jobDocsMap[job.id] || [];
      const noteCount = jobNotesCountMap[job.id] || 0;
      const photoCount = jobPhotosCountMap[job.id] || 0;

      const invoices = docs.filter((d) => d.document_type === "invoice");
      const estimates = docs.filter((d) => d.document_type === "estimate");

      const convertedEstimateIds = new Set(
        invoices.map((inv) => inv.converted_from_id).filter(Boolean)
      );

      const dedupedEstimateTotal = estimates.reduce((sum, est) => {
        if (convertedEstimateIds.has(est.id)) return sum;
        return sum + Number(est.total || 0);
      }, 0);

      const invoiceTotal = invoices.reduce((sum, inv) => {
        return sum + Number(inv.total || 0);
      }, 0);

      const dedupedTotal = invoiceTotal + dedupedEstimateTotal;

      return {
        ...job,
        client,
        invoiceCount: invoices.length,
        estimateCount: estimates.length,
        noteCount,
        photoCount,
        dedupedTotal,
      };
    });
  }, [jobs, clientsMap, jobDocsMap, jobNotesCountMap, jobPhotosCountMap]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return enrichedJobs.filter((job) => {
      const clientName = getClientDisplayName(job.client).toLowerCase();
      const title = String(job.title || "").toLowerCase();
      const jobNumber = String(job.job_number || "").toLowerCase();
      const description = String(job.description || "").toLowerCase();
      const status = String(job.status || "").toLowerCase();

      const matchesSearch =
        !q ||
        title.includes(q) ||
        clientName.includes(q) ||
        jobNumber.includes(q) ||
        description.includes(q);

      const matchesStatus =
        statusFilter === "all" || status === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [enrichedJobs, search, statusFilter]);

  function handleOpenJob(jobId) {
    router.push(`/jobs/${jobId}`);
  }



  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <p className={styles.loadingText}>Loading jobs...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <DashboardNavbar />

      <main className={styles.main}>
        <section className={styles.headerCard}>
          <div>
            <h1 className={styles.title}>Jobs</h1>
            <p className={styles.subtitle}>
              Manage projects, estimates, invoices, notes, and photos in one place.
            </p>
          </div>

          <button
            type="button"
            className={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            Create Job
          </button>
        </section>

        <JobsFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <section className={styles.listSection}>
          {filteredJobs.length === 0 ? (
            <div className={styles.emptyCard}>
              <h2 className={styles.emptyTitle}>No jobs found</h2>
              <p className={styles.emptyText}>
                Create your first job to start grouping estimates, invoices, notes, and photos.
              </p>
              <button
                type="button"
                className={styles.emptyButton}
                onClick={() => setShowCreateModal(true)}
              >
                Create Job
              </button>
            </div>
          ) : (
            <div className={styles.jobsList}>
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onOpen={() => handleOpenJob(job.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <CreateJobModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        ownerId={userId}
        onCreated={() => {
          setShowCreateModal(false);
          loadJobsPage();
        }}
      />
    </div>
  );
}

function getClientDisplayName(client) {
  return client?.name || "Unknown Client";
}