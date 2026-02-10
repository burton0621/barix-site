//InvoiceUtils.js

import { TAX_RATE, NEW_SERVICE_OPTION, makeBlankLineItem } from "./invoiceConstants";

/** yyyy-mm-dd for <input type="date" /> */
export function formatDateForInput(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(yyyyMmDd, days) {
  const [y, m, d] = (yyyyMmDd || "").split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + Number(days || 0));
  return formatDateForInput(dt);
}

/** EST-YYYYMMDD-XXXX or INV-YYYYMMDD-XXXX */
export function generateDocumentNumber(docType = "invoice") {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;

  const prefix = docType === "estimate" ? "EST" : "INV";
  return `${prefix}-${year}${month}${day}-${rand}`;
}

export function computeTotals(lineItems, indirect) {
  let baseSubtotal = 0;

  lineItems.forEach((item) => {
    const qty = parseFloat(item.quantity || "0");
    const rate = parseFloat(item.rate || "0");
    if (!isNaN(qty) && !isNaN(rate)) baseSubtotal += qty * rate;
  });

  const enabled = !!indirect?.enabled;
  const type = indirect?.type === "percent" ? "percent" : "amount";
  const amount = Number(indirect?.amount ?? 0);
  const percent = Number(indirect?.percent ?? 0);

  let indirectCharge = 0;
  if (enabled) {
    if (type === "amount") {
      indirectCharge = Math.max(0, amount);
    } else {
      const pct = Math.min(100, Math.max(0, percent));
      indirectCharge = (baseSubtotal * pct) / 100;
    }
  }

    const subtotal = round2(baseSubtotal + indirectCharge);
    const taxAmount = round2(subtotal * TAX_RATE);
    const total = round2(subtotal + taxAmount);

    return { baseSubtotal: round2(baseSubtotal), indirectCharge: round2(indirectCharge), subtotal, taxAmount, total };

}



export function validateLineItems(lineItems) {
  const valid = lineItems.filter((item) => {
    const hasDesc = item.description && item.description.trim() !== "";
    const hasName = item.name && item.name.trim() !== "";
    const qtyOk = parseFloat(item.quantity || "0") > 0;
    return (hasDesc || hasName) && qtyOk;
  });

  return { valid, isEmpty: valid.length === 0 };
}

export function applyServiceToLineItem(item, service) {
  return {
    ...item,
    serviceId: service?.id || "",
    name: service?.name || "",
    description: service?.description || "",
    rate: service?.default_rate != null ? String(service.default_rate) : "",
  };
}

export function clearLineItemService(item) {
  return { ...item, serviceId: "", name: "", description: "", rate: "" };
}

export function setCustomService(item) {
  return { ...item, serviceId: NEW_SERVICE_OPTION };
}

export function toLineItemsInsertPayload({ invoiceId, lineItems }) {
  return lineItems.map((item, index) => {
    const qty = parseFloat(item.quantity || "0");
    const rate = parseFloat(item.rate || "0");
    const lineTotal = !isNaN(qty) && !isNaN(rate) ? qty * rate : 0;

    const rawName = (item.name || "").trim();
    const rawDesc = (item.description || "").trim();

    const finalName = rawName || (rawDesc ? rawDesc.slice(0, 80) : "Line item");

    const serviceIdToSave =
      item.serviceId && item.serviceId !== NEW_SERVICE_OPTION ? item.serviceId : null;

    return {
      invoice_id: invoiceId,
      service_id: serviceIdToSave,
      name: finalName,
      description: rawDesc || null,
      quantity: qty,
      rate,
      line_total: lineTotal,
      position: index + 1,
    };
  });
}

export function toEditableLineItems(lineItemsRows) {
  if (!lineItemsRows?.length) return [makeBlankLineItem()];

  return lineItemsRows.map((row) => ({
    id: row.id,
    serviceId: row.service_id || "",
    name: row.name || "",
    description: row.description || "",
    quantity: String(row.quantity || "1"),
    rate: String(row.rate || ""),
  }));
}

function round2(n) {
  const x = Number(n);
  return Math.round((Number.isFinite(x) ? x : 0) * 100) / 100;
}
