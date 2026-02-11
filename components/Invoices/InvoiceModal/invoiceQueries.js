// invoiceQueries.js
import { supabase } from "@/lib/supabaseClient";
import { TAX_RATE } from "./invoiceConstants";

const DEBUG = true; // <-- set false to silence logs

function log(...args) {
  if (!DEBUG) return;
  console.log("[invoiceQueries]", ...args);
}

function warn(...args) {
  if (!DEBUG) return;
  console.warn("[invoiceQueries]", ...args);
}

function errLog(...args) {
  if (!DEBUG) return;
  console.error("[invoiceQueries]", ...args);
}

function summarizeError(error) {
  if (!error) return null;
  return {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    status: error.status,
  };
}

async function withLog(label, fn) {
  const started = performance.now?.() ?? Date.now();
  log(`${label} → start`);
  try {
    const result = await fn();
    const ended = performance.now?.() ?? Date.now();
    log(`${label} → success (${Math.round(ended - started)}ms)`, result);
    return result;
  } catch (e) {
    const ended = performance.now?.() ?? Date.now();
    errLog(`${label} → FAILED (${Math.round(ended - started)}ms)`, e, summarizeError(e));
    throw e;
  }
}

export async function getAuthedUser() {
  return withLog("getAuthedUser", async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data?.user) throw new Error("No authenticated user");
    return data.user;
  });
}

export async function fetchClients() {
  return withLog("fetchClients", async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, email")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  });
}

export async function fetchServices() {
  return withLog("fetchServices", async () => {
    const { data, error } = await supabase
      .from("services")
      .select("id, name, default_rate, description")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  });
}

export async function resolveContractorId(userId) {
  return withLog("resolveContractorId", async () => {
    let contractorIdToUse = userId;

    const { data, error } = await supabase
      .from("memberships")
      .select("contractor_id")
      .eq("user_id", userId)
      .maybeSingle();

    // This function intentionally does not throw if membership row doesn't exist
    if (error) warn("resolveContractorId: memberships query error (non-fatal)", summarizeError(error));
    if (!error && data?.contractor_id) contractorIdToUse = data.contractor_id;

    log("resolveContractorId result", { userId, contractorIdToUse, membership: data || null });
    return contractorIdToUse;
  });
}

export async function fetchDefaultDueDays(contractorId) {
  return withLog("fetchDefaultDueDays", async () => {
    const { data, error } = await supabase
      .from("contractor_settings")
      .select("default_invoice_due_days")
      .eq("contractor_id", contractorId)
      .maybeSingle();

    if (error) warn("fetchDefaultDueDays: contractor_settings query error (fallback to 30)", summarizeError(error));

    if (!error && data?.default_invoice_due_days != null) {
      return Number(data.default_invoice_due_days) || 30;
    }
    return 30;
  });
}

export async function fetchFreshInvoice(invoiceId) {
  return withLog("fetchFreshInvoice", async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*, clients(id, name, email)")
      .eq("id", invoiceId)
      .single();

    if (error) throw error;
    return data;
  });
}

export async function fetchInvoiceLineItems(invoiceId) {
  return withLog("fetchInvoiceLineItems", async () => {
    const { data, error } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("position", { ascending: true });

    if (error) throw error;
    return data || [];
  });
}

export async function createInvoiceHeader({
  userId,
  clientId,
  invoiceNumber,
  issueDate,
  dueDate,
  status,
  notes,
  internalNotes,
  subtotal,
  taxAmount,
  total,
  documentType,

  // NEW: indirect materials (per invoice)
  enableIndirectMaterials = false,
  indirectMaterialsAmount = 0,
  indirectMaterialsPercent = 0,
  indirectMaterialsDefaultType = "amount", // "amount" | "percent"
}) {
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      owner_id: userId,
      client_id: clientId,
      invoice_number: invoiceNumber || null,
      issue_date: issueDate,
      due_date: dueDate,
      status,
      notes: notes || null,
      internal_notes: internalNotes || null,

      subtotal, // should already include indirect materials (your computeTotals subtotal)
      tax_rate: TAX_RATE,
      tax_amount: taxAmount,
      total,
      document_type: documentType,

      // NEW columns
      enable_indirect_materials: !!enableIndirectMaterials,
      indirect_materials_amount: Number(indirectMaterialsAmount) || 0,
      indirect_materials_percent: Number(indirectMaterialsPercent) || 0,
      indirect_materials_default_type:
        indirectMaterialsDefaultType === "percent" ? "percent" : "amount",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}



export async function updateInvoiceHeader({
  invoiceId,
  clientId,
  invoiceNumber,
  issueDate,
  dueDate,
  status,
  notes,
  internalNotes,
  subtotal,
  taxAmount,
  total,

  // NEW: indirect materials (per invoice)
  enableIndirectMaterials = false,
  indirectMaterialsAmount = 0,
  indirectMaterialsPercent = 0,
  indirectMaterialsDefaultType = "amount",
}) {
  const { data, error } = await supabase
    .from("invoices")
    .update({
      client_id: clientId,
      invoice_number: invoiceNumber || null,
      issue_date: issueDate,
      due_date: dueDate,
      status,
      notes: notes || null,
      internal_notes: internalNotes || null,

      subtotal,
      tax_rate: TAX_RATE,
      tax_amount: taxAmount,
      total,

      // NEW columns
      enable_indirect_materials: !!enableIndirectMaterials,
      indirect_materials_amount: Number(indirectMaterialsAmount) || 0,
      indirect_materials_percent: Number(indirectMaterialsPercent) || 0,
      indirect_materials_default_type:
        indirectMaterialsDefaultType === "percent" ? "percent" : "amount",
    })
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}



export async function replaceInvoiceLineItems({ invoiceId, payload }) {
  return withLog("replaceInvoiceLineItems", async () => {
    log("replaceInvoiceLineItems payload sample", payload?.slice?.(0, 3) ?? payload);

    const { error: delErr } = await supabase
      .from("invoice_line_items")
      .delete()
      .eq("invoice_id", invoiceId);

    if (delErr) throw delErr;

    const { error: insErr } = await supabase
      .from("invoice_line_items")
      .insert(payload);

    if (insErr) throw insErr;

    return true;
  });
}

export async function insertInvoiceLineItems(payload) {
  return withLog("insertInvoiceLineItems", async () => {
    log("insertInvoiceLineItems payload sample", payload?.slice?.(0, 3) ?? payload);

    const { error } = await supabase.from("invoice_line_items").insert(payload);
    if (error) throw error;

    return true;
  });
}

export async function sendInvoiceEmail({ invoiceId, userId }) {
  return withLog("sendInvoiceEmail", async () => {
    log("sendInvoiceEmail request", { invoiceId, userId });

    const res = await fetch("/api/send-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, userId }),
    });

    const json = await res.json();
    log("sendInvoiceEmail response", { ok: res.ok, status: res.status, json });

    if (!res.ok) {
      const msg = json?.error || "Failed to send email.";
      throw new Error(msg);
    }

    return json;
  });
}

export async function fetchIndirectMaterialsDefaults(contractorId) {
  return withLog("fetchIndirectMaterialsDefaults", async () => {
    const { data, error } = await supabase
      .from("contractor_settings")
      .select(
        "enable_indirect_materials, indirect_materials_amount, indirect_materials_percent, indirect_materials_default_type"
      )
      .eq("contractor_id", contractorId)
      .maybeSingle();

    if (error) throw error;

    const result = {
      enabled: !!data?.enable_indirect_materials,
      amount: Number(data?.indirect_materials_amount ?? 0),
      percent: Number(data?.indirect_materials_percent ?? 0),
      defaultType: data?.indirect_materials_default_type === "percent" ? "percent" : "amount",
    };

    log("fetchIndirectMaterialsDefaults result", { contractorId, result });
    return result;
  });
}
