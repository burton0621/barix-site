"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabaseClient";
import styles from "./ClientUpload.module.css";

/**
 * Client Upload Modal
 * -------------------
 * - Upload CSV/XLSX
 * - Parse rows into "clients" shape
 * - Detect duplicates vs existing clients and within file
 * - Preview table, mark duplicates red
 * - Confirm import inserts only non-duplicates into DB
 *
 * Expected columns (case-insensitive, spaces/underscores ignored):
 * name, email, phone,
 * service_address_line1, service_address_line2, service_city, service_state, service_postal_code,
 * billing_address_line1, billing_address_line2, billing_city, billing_state, billing_postal_code
 */

const FIELDS = [
  "name",
  "email",
  "phone",
  "service_address_line1",
  "service_address_line2",
  "service_city",
  "service_state",
  "service_postal_code",
  "billing_address_line1",
  "billing_address_line2",
  "billing_city",
  "billing_state",
  "billing_postal_code",
];

function normalizeHeaderKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function normalizeStr(s) {
  return String(s || "").trim();
}

function normalizeEmail(s) {
  return normalizeStr(s).toLowerCase();
}

function normalizePhone(s) {
  // keep digits only
  return normalizeStr(s).replace(/\D/g, "");
}

function buildDedupeKey(row) {
  const email = normalizeEmail(row.email);
  const phone = normalizePhone(row.phone);
  const name = normalizeStr(row.name).toLowerCase();
  const addr1 = normalizeStr(row.service_address_line1).toLowerCase();
  const postal = normalizeStr(row.service_postal_code).toLowerCase();

  // Strongest keys first
  if (email) return `email:${email}`;
  if (phone) return `phone:${phone}`;

  // Fallback: name + address line1 + postal
  return `fallback:${name}|${addr1}|${postal}`;
}

function cleanRow(raw) {
  const out = {};
  for (const f of FIELDS) out[f] = "";

  for (const [k, v] of Object.entries(raw || {})) {
    const nk = normalizeHeaderKey(k);

    // map common variations
    const mapped =
      nk === "zipcode" ? "service_postal_code" :
      nk === "zip" ? "service_postal_code" :
      nk === "postal" ? "service_postal_code" :
      nk === "state" ? "service_state" :
      nk === "city" ? "service_city" :
      nk === "address" ? "service_address_line1" :
      nk === "address1" ? "service_address_line1" :
      nk === "address2" ? "service_address_line2" :
      nk === "billing_zip" ? "billing_postal_code" :
      nk === "billing_zipcode" ? "billing_postal_code" :
      nk === "billing_state" ? "billing_state" :
      nk === "billing_city" ? "billing_city" :
      nk === "billing_address" ? "billing_address_line1" :
      nk === "billing_address1" ? "billing_address_line1" :
      nk === "billing_address2" ? "billing_address_line2" :
      nk;

    if (FIELDS.includes(mapped)) {
      out[mapped] = normalizeStr(v);
    }
  }

  // Light cleanup
  out.email = normalizeEmail(out.email);
  // keep original phone formatting for display, but we’ll normalize for keys
  out.phone = normalizeStr(out.phone);

  return out;
}

async function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h,
      complete: (results) => resolve(results.data || []),
      error: (err) => reject(err),
    });
  });
}

async function parseXlsxFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" }); // array of objects
  return rows || [];
}

async function insertInChunks(table, rows, chunkSize = 200) {
  const inserted = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase.from(table).insert(chunk).select("*");
    if (error) throw error;
    if (data?.length) inserted.push(...data);
  }
  return inserted;
}

export default function ClientUploadModal({
  open,
  onClose,
  ownerId,
  existingClients = [],
  onImported, // (insertedClients) => void
}) {
  const inputRef = useRef(null);

  const [stage, setStage] = useState("idle"); // idle | parsing | ready | importing | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");

  const [rows, setRows] = useState([]); // cleaned rows
  const [dupFlags, setDupFlags] = useState([]); // boolean per row
  const [dupReason, setDupReason] = useState([]); // string per row

  const existingKeySet = useMemo(() => {
    const set = new Set();
    for (const c of existingClients) {
      set.add(buildDedupeKey(c));
    }
    return set;
  }, [existingClients]);

  const summary = useMemo(() => {
    const total = rows.length;
    const dupes = dupFlags.filter(Boolean).length;
    const ready = total - dupes;
    return { total, dupes, ready };
  }, [rows, dupFlags]);

  function resetAll() {
    setStage("idle");
    setErrorMsg("");
    setFileName("");
    setRows([]);
    setDupFlags([]);
    setDupReason([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadClientTemplateCSV() {
  const headers = [
    "name",
    "email",
    "phone",
    "service_address_line1",
    "service_address_line2",
    "service_city",
    "service_state",
    "service_postal_code",
    "billing_address_line1",
    "billing_address_line2",
    "billing_city",
    "billing_state",
    "billing_postal_code",
  ];

  // Optional: include one example row (helps users avoid column shifting)
  const exampleRow = [
    "Jane Doe",
    "jane.doe@example.com",
    "6165551234",
    "123 Main St",
    "",
    "Grand Rapids",
    "MI",
    "49503",
    "123 Main St",
    "",
    "Grand Rapids",
    "MI",
    "49503",
  ];

  const csv = Papa.unparse([Object.fromEntries(headers.map((h, i) => [h, exampleRow[i]]))], {
    columns: headers,
    header: true,
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob("clients-import-template.csv", blob);
}

function downloadClientTemplateXLSX() {
  const headers = [
    "name",
    "email",
    "phone",
    "service_address_line1",
    "service_address_line2",
    "service_city",
    "service_state",
    "service_postal_code",
    "billing_address_line1",
    "billing_address_line2",
    "billing_city",
    "billing_state",
    "billing_postal_code",
  ];

  const exampleRow = {
    name: "Jane Doe",
    email: "jane.doe@example.com",
    phone: "6165551234",
    service_address_line1: "123 Main St",
    service_address_line2: "",
    service_city: "Grand Rapids",
    service_state: "MI",
    service_postal_code: "49503",
    billing_address_line1: "123 Main St",
    billing_address_line2: "",
    billing_city: "Grand Rapids",
    billing_state: "MI",
    billing_postal_code: "49503",
  };

  const ws = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
  // Ensure header order exactly as desired
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  downloadBlob("clients-import-template.xlsx", blob);
}


  async function handleFile(file) {
    setErrorMsg("");
    setStage("parsing");
    setFileName(file?.name || "");

    try {
      const ext = (file?.name || "").split(".").pop().toLowerCase();
      let rawRows = [];

      if (ext === "csv") rawRows = await parseCsvFile(file);
      else if (ext === "xlsx" || ext === "xls") rawRows = await parseXlsxFile(file);
      else throw new Error("Unsupported file type. Please upload a .csv or .xlsx");

      // Clean + remove empty rows (must have at least a name OR email OR phone)
      const cleaned = rawRows
        .map(cleanRow)
        .filter((r) => r.name || r.email || r.phone);

      // Dedupe checks: vs existing + within upload
      const seenUpload = new Set();
      const flags = [];
      const reasons = [];

      for (const r of cleaned) {
        const key = buildDedupeKey(r);

        if (existingKeySet.has(key)) {
          flags.push(true);
          reasons.push("Duplicate (already in your clients)");
          continue;
        }

        if (seenUpload.has(key)) {
          flags.push(true);
          reasons.push("Duplicate (repeated in this upload)");
          continue;
        }

        seenUpload.add(key);
        flags.push(false);
        reasons.push("");
      }

      setRows(cleaned);
      setDupFlags(flags);
      setDupReason(reasons);
      setStage("ready");
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Failed to parse file.");
      setStage("error");
    }
  }

  async function confirmImport() {
    if (!ownerId) {
      setErrorMsg("Missing ownerId. Please refresh and try again.");
      setStage("error");
      return;
    }

    setErrorMsg("");
    setStage("importing");

    try {
      const toInsert = rows
        .map((r, idx) => ({ r, idx }))
        .filter(({ idx }) => !dupFlags[idx])
        .map(({ r }) => ({
          owner_id: ownerId,
          ...r,
        }));

      if (toInsert.length === 0) {
        setStage("done");
        onImported?.([]);
        return;
      }

      const inserted = await insertInChunks("clients", toInsert, 200);

      setStage("done");
      onImported?.(inserted);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || "Import failed. Please try again.");
      setStage("error");
    }
  }

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.title}>Import Clients</h2>
            <p className={styles.subtitle}>
              Upload a CSV or XLSX export of your clients. Duplicates will be skipped.
            </p>
          </div>

          <button
            className={styles.closeButton}
            onClick={() => {
              resetAll();
              onClose?.();
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Upload area */}
          <div className={styles.uploadCard}>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className={styles.fileInput}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            <div className={styles.uploadRow}>
            <button
                className={styles.primaryButton}
                onClick={() => inputRef.current?.click()}
                disabled={stage === "parsing" || stage === "importing"}
            >
                Choose File
            </button>

            <div className={styles.templateButtons}>
                <button
                type="button"
                className={styles.templateButton}
                onClick={downloadClientTemplateCSV}
                disabled={stage === "parsing" || stage === "importing"}
                >
                Download CSV Template
                </button>

                <button
                type="button"
                className={styles.templateButton}
                onClick={downloadClientTemplateXLSX}
                disabled={stage === "parsing" || stage === "importing"}
                >
                Download XLSX Template
                </button>
            </div>

            <div className={styles.fileMeta}>
                <div className={styles.fileName}>
                {fileName ? fileName : "No file selected"}
                </div>
                <div className={styles.hint}>Supported: .csv, .xlsx (first sheet)</div>
            </div>

            {(rows.length > 0 || stage === "error" || stage === "done") && (
                <button
                className={styles.ghostButton}
                onClick={resetAll}
                disabled={stage === "parsing" || stage === "importing"}
                >
                Reset
                </button>
            )}
            </div>

            {stage === "parsing" && (
              <div className={styles.statusInfo}>Parsing file…</div>
            )}

            {errorMsg && (
              <div className={styles.errorBox}>
                <div className={styles.errorTitle}>Couldn’t import</div>
                <div className={styles.errorText}>{errorMsg}</div>
              </div>
            )}

            {stage === "done" && (
              <div className={styles.successBox}>
                Import complete. Added new clients to your list.
              </div>
            )}
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <div className={styles.previewStats}>
                  <span><strong>{summary.total}</strong> extracted</span>
                  <span className={styles.dot}>•</span>
                  <span className={styles.dupText}><strong>{summary.dupes}</strong> duplicates</span>
                  <span className={styles.dot}>•</span>
                  <span className={styles.readyText}><strong>{summary.ready}</strong> ready to import</span>
                </div>

                <button
                  className={styles.confirmButton}
                  onClick={confirmImport}
                  disabled={stage !== "ready" || summary.ready === 0}
                >
                  {stage === "importing" ? "Importing…" : "Confirm Import"}
                </button>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Service City</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, idx) => {
                      const isDup = dupFlags[idx];
                      return (
                        <tr key={idx} className={isDup ? styles.dupRow : ""}>
                          <td>{r.name || "-"}</td>
                          <td>{r.email || "-"}</td>
                          <td>{r.phone || "-"}</td>
                          <td>{r.service_city || "-"}</td>
                          <td className={styles.statusCell}>
                            {isDup ? (
                              <span className={styles.dupBadge}>
                                Duplicate
                                {dupReason[idx] ? ` — ${dupReason[idx]}` : ""}
                              </span>
                            ) : (
                              <span className={styles.okBadge}>Will import</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {rows.length > 50 && (
                  <div className={styles.previewFooter}>
                    Showing first 50 of {rows.length} rows.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.ghostButton}
            onClick={() => {
              resetAll();
              onClose?.();
            }}
            disabled={stage === "parsing" || stage === "importing"}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
