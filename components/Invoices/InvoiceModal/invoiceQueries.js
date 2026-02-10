import { supabase } from "@/lib/supabaseClient";
import { TAX_RATE } from "./invoiceConstants";

export async function getAuthedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) throw new Error("No authenticated user");
  return data.user;
}

export async function fetchClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, email")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchServices() {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, default_rate, description")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function resolveContractorId(userId) {
  let contractorIdToUse = userId;

  const { data, error } = await supabase
    .from("memberships")
    .select("contractor_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error && data?.contractor_id) contractorIdToUse = data.contractor_id;
  return contractorIdToUse;
}

export async function fetchDefaultDueDays(contractorId) {
  const { data, error } = await supabase
    .from("contractor_settings")
    .select("default_invoice_due_days")
    .eq("contractor_id", contractorId)
    .maybeSingle();

  if (!error && data?.default_invoice_due_days != null) {
    return Number(data.default_invoice_due_days) || 30;
  }
  return 30;
}

export async function fetchFreshInvoice(invoiceId) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, clients(id, name, email)")
    .eq("id", invoiceId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchInvoiceLineItems(invoiceId) {
  const { data, error } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data || [];
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
      subtotal,
      tax_rate: TAX_RATE,
      tax_amount: taxAmount,
      total,
      document_type: documentType,
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
    })
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function replaceInvoiceLineItems({ invoiceId, payload }) {
  const { error: delErr } = await supabase
    .from("invoice_line_items")
    .delete()
    .eq("invoice_id", invoiceId);

  if (delErr) throw delErr;

  const { error: insErr } = await supabase
    .from("invoice_line_items")
    .insert(payload);

  if (insErr) throw insErr;
}

export async function insertInvoiceLineItems(payload) {
  const { error } = await supabase.from("invoice_line_items").insert(payload);
  if (error) throw error;
}

export async function sendInvoiceEmail({ invoiceId, userId }) {
  const res = await fetch("/api/send-invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoiceId, userId }),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error || "Failed to send email.";
    throw new Error(msg);
  }

  return json; // { clientEmail, statusUpdated, ... }
}
