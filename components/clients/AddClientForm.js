"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./AddClientForm.module.css";

export default function AddClientForm({ ownerId, onCreated, onCancel }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  /* --- Service Address --- */
  const [serviceLine1, setServiceLine1] = useState("");
  const [serviceLine2, setServiceLine2] = useState("");
  const [serviceCity, setServiceCity] = useState("");
  const [serviceState, setServiceState] = useState("");
  const [serviceZip, setServiceZip] = useState("");

  /* --- Billing Address --- */
  const [sameAsService, setSameAsService] = useState(true);
  const [billingLine1, setBillingLine1] = useState("");
  const [billingLine2, setBillingLine2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
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

      // SERVICE ADDRESS
      service_address_line1: serviceLine1.trim() || null,
      service_address_line2: serviceLine2.trim() || null,
      service_city: serviceCity.trim() || null,
      service_state: serviceState.trim() || null,
      service_postal_code: serviceZip.trim() || null,
      service_country: "US", // defaulted

      // BILLING ADDRESS
      billing_same_as_service: sameAsService,
      billing_address_line1: (sameAsService ? serviceLine1 : billingLine1).trim() || null,
      billing_address_line2: (sameAsService ? serviceLine2 : billingLine2).trim() || null,
      billing_city: (sameAsService ? serviceCity : billingCity).trim() || null,
      billing_state: (sameAsService ? serviceState : billingState).trim() || null,
      billing_postal_code: (sameAsService ? serviceZip : billingZip).trim() || null,
      billing_country: "US", // defaulted
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

      // reset form but keep modal open (you can change this if you want)
      setName("");
      setEmail("");
      setPhone("");
      setServiceLine1("");
      setServiceLine2("");
      setServiceCity("");
      setServiceState("");
      setServiceZip("");
      setBillingLine1("");
      setBillingLine2("");
      setBillingCity("");
      setBillingState("");
      setBillingZip("");
      setSameAsService(true);
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitting(false);
      setErrorMsg("Unexpected error while saving client.");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.formTitle}>Add Client</h2>

      {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

      {/* Basic Info */}
      <label className={styles.label}>Name</label>
      <input
        className={styles.input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <label className={styles.label}>Email</label>
      <input
        className={styles.input}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label className={styles.label}>Phone</label>
      <input
        className={styles.input}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

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

      <div className={styles.buttonRow}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.saveButton}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save Client"}
        </button>
      </div>
    </form>
  );
}
