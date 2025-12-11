"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./AddClientForm.module.css";
import ConfirmDialog from "../common/ConfirmDialog/ConfirmDialog";

export default function AddClientForm({
  ownerId,
  mode = "create",
  client = null,
  onCreated,
  onUpdated,
  onDeleted,
  onCancel,
}) {
  const isEdit = mode === "edit";
  const initial = client || {};

  // Basic info
  const [name, setName] = useState(initial.name || "");
  const [email, setEmail] = useState(initial.email || "");
  const [phone, setPhone] = useState(initial.phone || "");

  // Service address
  const [serviceLine1, setServiceLine1] = useState(
    initial.service_address_line1 || ""
  );
  const [serviceLine2, setServiceLine2] = useState(
    initial.service_address_line2 || ""
  );
  const [serviceCity, setServiceCity] = useState(initial.service_city || "");
  const [serviceState, setServiceState] = useState(initial.service_state || "");
  const [serviceZip, setServiceZip] = useState(
    initial.service_postal_code || ""
  );

  // Billing address
  const [sameAsService, setSameAsService] = useState(
    initial.billing_same_as_service ?? true
  );
  const [billingLine1, setBillingLine1] = useState(
    initial.billing_address_line1 || ""
  );
  const [billingLine2, setBillingLine2] = useState(
    initial.billing_address_line2 || ""
  );
  const [billingCity, setBillingCity] = useState(initial.billing_city || "");
  const [billingState, setBillingState] = useState(
    initial.billing_state || ""
  );
  const [billingZip, setBillingZip] = useState(
    initial.billing_postal_code || ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmAction, setConfirmAction] = useState(null); // 'update' | 'delete' | null

  // For dirty check (only matters in edit mode)
  const originalPayload = isEdit
    ? {
        name: initial.name || "",
        email: initial.email || "",
        phone: initial.phone || "",
        serviceLine1: initial.service_address_line1 || "",
        serviceLine2: initial.service_address_line2 || "",
        serviceCity: initial.service_city || "",
        serviceState: initial.service_state || "",
        serviceZip: initial.service_postal_code || "",
        sameAsService: initial.billing_same_as_service ?? true,
        billingLine1: initial.billing_address_line1 || "",
        billingLine2: initial.billing_address_line2 || "",
        billingCity: initial.billing_city || "",
        billingState: initial.billing_state || "",
        billingZip: initial.billing_postal_code || "",
      }
    : null;

  const currentPayload = {
    name,
    email,
    phone,
    serviceLine1,
    serviceLine2,
    serviceCity,
    serviceState,
    serviceZip,
    sameAsService,
    billingLine1,
    billingLine2,
    billingCity,
    billingState,
    billingZip,
  };

  const isDirty =
    !isEdit ||
    JSON.stringify(originalPayload) !== JSON.stringify(currentPayload);

  async function handleCreate(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!ownerId) {
      setErrorMsg("No ownerId found – make sure the user is logged in.");
      return;
    }

    if (!name.trim()) {
      setErrorMsg("Client name is required.");
      return;
    }

    const payload = {
      owner_id: ownerId,
      name: name.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      // Service
      service_address_line1: serviceLine1.trim() || null,
      service_address_line2: serviceLine2.trim() || null,
      service_city: serviceCity.trim() || null,
      service_state: serviceState.trim() || null,
      service_postal_code: serviceZip.trim() || null,
      service_country: "US",
      // Billing
      billing_same_as_service: sameAsService,
      billing_address_line1: (sameAsService ? serviceLine1 : billingLine1)
        .trim()
        .slice(0) || null,
      billing_address_line2: (sameAsService ? serviceLine2 : billingLine2)
        .trim()
        .slice(0) || null,
      billing_city: (sameAsService ? serviceCity : billingCity)
        .trim()
        .slice(0) || null,
      billing_state: (sameAsService ? serviceState : billingState)
        .trim()
        .slice(0) || null,
      billing_postal_code: (sameAsService ? serviceZip : billingZip)
        .trim()
        .slice(0) || null,
      billing_country: "US",
    };

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from("clients")
        .insert(payload)
        .select()
        .single();
      setSubmitting(false);

      if (error) {
        console.error("Insert error:", error);
        setErrorMsg(error.message || "Something went wrong saving the client.");
        return;
      }

      if (onCreated && data) {
        onCreated(data);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitting(false);
      setErrorMsg("Unexpected error while saving client.");
    }
  }

  async function handleUpdateConfirm() {
    if (!client || !isEdit) return;
    setErrorMsg("");

    const payload = {
      name: name.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      // Service
      service_address_line1: serviceLine1.trim() || null,
      service_address_line2: serviceLine2.trim() || null,
      service_city: serviceCity.trim() || null,
      service_state: serviceState.trim() || null,
      service_postal_code: serviceZip.trim() || null,
      service_country: "US",
      // Billing
      billing_same_as_service: sameAsService,
      billing_address_line1: (sameAsService ? serviceLine1 : billingLine1)
        .trim()
        .slice(0) || null,
      billing_address_line2: (sameAsService ? serviceLine2 : billingLine2)
        .trim()
        .slice(0) || null,
      billing_city: (sameAsService ? serviceCity : billingCity)
        .trim()
        .slice(0) || null,
      billing_state: (sameAsService ? serviceState : billingState)
        .trim()
        .slice(0) || null,
      billing_postal_code: (sameAsService ? serviceZip : billingZip)
        .trim()
        .slice(0) || null,
      billing_country: "US",
    };

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", client.id)
        .select()
        .single();
      setSubmitting(false);

      if (error) {
        console.error("Update error:", error);
        setErrorMsg(
          error.message || "Something went wrong updating the client."
        );
        return;
      }

      if (onUpdated && data) {
        onUpdated(data);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitting(false);
      setErrorMsg("Unexpected error while updating client.");
    }
  }

  async function handleDeleteConfirm() {
    if (!client || !isEdit) return;
    setErrorMsg("");

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", client.id);
      setSubmitting(false);

      if (error) {
        console.error("Delete error:", error);
        setErrorMsg(
          error.message || "Something went wrong deleting the client."
        );
        return;
      }

      if (onDeleted) {
        onDeleted(client.id);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitting(false);
      setErrorMsg("Unexpected error while deleting client.");
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={isEdit ? (e) => e.preventDefault() : handleCreate}
    >
      <h2 className={styles.formTitle}>
        {isEdit ? "Edit Client" : "Add Client"}
      </h2>

      {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

      {/* Basic info row: Name / Email / Phone */}
      <div className={styles.row}>
        <div className={styles.colWide}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className={styles.colWide}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className={styles.colSlim}>
          <label className={styles.label}>Phone</label>
          <input
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      {/* Service Address */}
      <h3 className={styles.sectionTitle}>Service Address</h3>

      <label className={styles.label}>Address Line 1</label>
      <input
        className={styles.input}
        value={serviceLine1}
        onChange={(e) => setServiceLine1(e.target.value)}
      />

      <label className={styles.label}>Address Line 2</label>
      <input
        className={styles.input}
        value={serviceLine2}
        onChange={(e) => setServiceLine2(e.target.value)}
      />

      <div className={styles.row}>
        <div className={styles.colCity}>
          <label className={styles.label}>City</label>
          <input
            className={styles.input}
            value={serviceCity}
            onChange={(e) => setServiceCity(e.target.value)}
          />
        </div>
        <div className={styles.colState}>
          <label className={styles.label}>State</label>
          <input
            className={styles.input}
            value={serviceState}
            onChange={(e) => setServiceState(e.target.value)}
          />
        </div>
        <div className={styles.colZip}>
          <label className={styles.label}>ZIP</label>
          <input
            className={styles.input}
            value={serviceZip}
            onChange={(e) => setServiceZip(e.target.value)}
          />
        </div>
      </div>

      {/* Billing Address */}
      <h3 className={styles.sectionTitle}>Billing Address</h3>

      <div className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={sameAsService}
          onChange={(e) => setSameAsService(e.target.checked)}
        />
        <span>Billing same as service</span>
      </div>

      {!sameAsService && (
        <>
          <label className={styles.label}>Address Line 1</label>
          <input
            className={styles.input}
            value={billingLine1}
            onChange={(e) => setBillingLine1(e.target.value)}
          />

          <label className={styles.label}>Address Line 2</label>
          <input
            className={styles.input}
            value={billingLine2}
            onChange={(e) => setBillingLine2(e.target.value)}
          />

          <div className={styles.row}>
            <div className={styles.colCity}>
              <label className={styles.label}>City</label>
              <input
                className={styles.input}
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
              />
            </div>
            <div className={styles.colState}>
              <label className={styles.label}>State</label>
              <input
                className={styles.input}
                value={billingState}
                onChange={(e) => setBillingState(e.target.value)}
              />
            </div>
            <div className={styles.colZip}>
              <label className={styles.label}>ZIP</label>
              <input
                className={styles.input}
                value={billingZip}
                onChange={(e) => setBillingZip(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* Buttons */}
      <div className={styles.buttonRow}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>

        {isEdit && (
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => setConfirmAction("delete")}
            disabled={submitting}
          >
            Delete Client
          </button>
        )}

        {isEdit ? (
          <button
            type="button"
            className={styles.saveButton}
            onClick={() => setConfirmAction("update")}
            disabled={submitting || !isDirty}
          >
            {submitting ? "Saving..." : "Update"}
          </button>
        ) : (
          <button
            type="submit"
            className={styles.saveButton}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Client"}
          </button>
        )}
      </div>

      {/* Confirm dialogs */}
      {confirmAction === "update" && (
        <ConfirmDialog
          open={true}
          title="Confirm Update"
          message="Are you sure you want to update this client's information?"
          confirmLabel="Yes, Update"
          confirmType="primary"
          onConfirm={() => {
            setConfirmAction(null);
            handleUpdateConfirm();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === "delete" && (
        <ConfirmDialog
          open={true}
          title="Delete Client"
          message="Are you sure you want to delete this client? This action cannot be undone."
          confirmLabel="Yes, Delete"
          confirmType="danger"
          onConfirm={() => {
            setConfirmAction(null);
            handleDeleteConfirm();
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </form>
  );
}
