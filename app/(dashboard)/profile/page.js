"use client";

/*
  Profile Page
  ------------
  Contractors manage company profile details.
  Admins can edit; non-admins can view only.
*/

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import styles from "./profile.module.css";
import { FaPencilAlt, FaPlus, FaTrash } from "react-icons/fa";

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmTone = "primary", // "primary" | "danger"
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <p className={styles.modalMessage}>{message}</p>
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.modalCancel}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className={
              confirmTone === "danger" ? styles.modalConfirmDanger : styles.modalConfirm
            }
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  const [editingSection, setEditingSection] = useState(null);

  // MAIN PROFILE FIELDS
  const [companyName, setCompanyName] = useState("");
  const [contractingTrade, setContractingTrade] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // RELATIONAL TABLE STATES
  const [addresses, setAddresses] = useState([]);
  const [serviceRegions, setServiceRegions] = useState([]);
  const [licenses, setLicenses] = useState([]);

  // UI feedback
  const [banner, setBanner] = useState({ type: "", message: "" }); // type: "success" | "error" | ""
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmLogoDeleteOpen, setConfirmLogoDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoWorking, setLogoWorking] = useState(false);

  const BUSINESS_TYPES = useMemo(
    () => [
      "HVAC",
      "Lawn Care",
      "Plumbing",
      "Roofing",
      "Painting",
      "Carpentry",
      "Electrical",
      "General Contracting",
    ],
    []
  );

  useEffect(() => {
    async function load() {
      setBanner({ type: "", message: "" });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Load main contractor profile
      const { data: profile, error: profileErr } = await supabase
        .from("contractor_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileErr) {
        setBanner({ type: "error", message: "Failed to load profile." });
      }

      if (profile) {
        setCompanyName(profile.company_name || "");
        setContractingTrade(profile.contracting_trade || "");
        setBusinessPhone(profile.business_phone || "");
        setBusinessEmail(profile.business_email || "");
        setBusinessWebsite(profile.business_website || "");
        setLogoUrl(profile.logo_url || "");
      }

      // Load ADDRESSES
      const { data: addressRows } = await supabase
        .from("contractor_addresses")
        .select("*")
        .eq("contractor_id", user.id);

      const normalizedAddresses =
        addressRows && addressRows.length > 0
          ? addressRows
          : [{ street: "", unit: "", city: "", state: "", zip: "" }];

      setAddresses(normalizedAddresses);

      // Load SERVICE REGIONS
      const { data: regions } = await supabase
        .from("contractor_service_regions")
        .select("*")
        .eq("contractor_id", user.id);

      setServiceRegions(regions?.map((r) => r.region_name) || []);

      // Load LICENSES
      const { data: licenseRows } = await supabase
        .from("contractor_licenses")
        .select("*")
        .eq("contractor_id", user.id);

      setLicenses(
        licenseRows?.map((l) => ({
          number: l.license_number || "",
          state: l.license_state || "",
          expiration: l.license_expiration || "",
        })) || []
      );

      setLoading(false);
    }

    load();
  }, []);

  function startEdit(sectionKey) {
    if (!isAdmin) return;
    setBanner({ type: "", message: "" });
    setEditingSection(sectionKey);
  }

  function cancelEdit() {
    // keeping it simple: just close edit mode (no revert)
    setEditingSection(null);
    setConfirmSaveOpen(false);
    setBanner({ type: "", message: "" });
  }

  async function saveProfile() {
    setSaving(true);
    setBanner({ type: "", message: "" });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      /* -------------------------------
         1. UPDATE MAIN PROFILE
      --------------------------------*/
      const { error: mainErr } = await supabase
        .from("contractor_profiles")
        .update({
          company_name: companyName,
          contracting_trade: contractingTrade,
          business_phone: businessPhone,
          business_email: businessEmail,
          business_website: businessWebsite,
          logo_url: logoUrl,
        })
        .eq("id", user.id);

      if (mainErr) throw mainErr;

      /* -------------------------------
         2. REPLACE ADDRESSES
      --------------------------------*/
      const { error: addrDelErr } = await supabase
        .from("contractor_addresses")
        .delete()
        .eq("contractor_id", user.id);

      if (addrDelErr) throw addrDelErr;

      if (addresses.length > 0) {
        const a = addresses[0];
        const { error: addrInsErr } = await supabase
          .from("contractor_addresses")
          .insert({
            contractor_id: user.id,
            street: a.street,
            unit: a.unit,
            city: a.city,
            state: a.state,
            zip: a.zip,
            country: "USA",
          });

        if (addrInsErr) throw addrInsErr;
      }

      /* -------------------------------
         3. REPLACE SERVICE REGIONS
      --------------------------------*/
      const { error: regionDelErr } = await supabase
        .from("contractor_service_regions")
        .delete()
        .eq("contractor_id", user.id);

      if (regionDelErr) throw regionDelErr;

      if (serviceRegions.length > 0) {
        const rows = serviceRegions
          .map((r) => (r || "").trim())
          .filter(Boolean)
          .map((r) => ({
            contractor_id: user.id,
            region_name: r,
          }));

        if (rows.length) {
          const { error: regionInsErr } = await supabase
            .from("contractor_service_regions")
            .insert(rows);

          if (regionInsErr) throw regionInsErr;
        }
      }

      /* -------------------------------
         4. REPLACE LICENSES
      --------------------------------*/
      const { error: licDelErr } = await supabase
        .from("contractor_licenses")
        .delete()
        .eq("contractor_id", user.id);

      if (licDelErr) throw licDelErr;

      if (licenses.length > 0) {
        const rows = licenses
          .map((l) => ({
            number: (l.number || "").trim(),
            state: (l.state || "").trim(),
            expiration: l.expiration || "",
          }))
          .filter((l) => l.number || l.state || l.expiration)
          .map((l) => ({
            contractor_id: user.id,
            license_number: l.number || null,
            license_state: l.state || null,
            license_expiration: l.expiration || null,
          }));

        if (rows.length) {
          const { error: licInsErr } = await supabase
            .from("contractor_licenses")
            .insert(rows);

          if (licInsErr) throw licInsErr;
        }
      }

      setBanner({ type: "success", message: "Profile updated successfully." });
      setEditingSection(null);
      setConfirmSaveOpen(false);
    } catch (err) {
      console.error(err);
      setBanner({
        type: "error",
        message: err?.message || "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  // Logo upload handler
  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoWorking(true);
    setBanner({ type: "", message: "" });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const fileExt = file.name.split(".").pop();
      const newFileName = `logo.${fileExt}`;
      const filePath = `${user.id}/${newFileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from("contractor-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Create signed URL (valid 1 year)
      const { data: signedUrlData, error: signedErr } = await supabase.storage
        .from("contractor-logos")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      if (signedErr) throw signedErr;

      const signedURL = signedUrlData.signedUrl;

      // Save URL to profile table
      const { error: dbErr } = await supabase
        .from("contractor_profiles")
        .update({ logo_url: signedURL })
        .eq("id", user.id);

      if (dbErr) throw dbErr;

      setLogoUrl(signedURL);
      setBanner({ type: "success", message: "Logo updated." });
    } catch (err) {
      console.error(err);
      setBanner({ type: "error", message: "Failed to upload logo." });
    } finally {
      setLogoWorking(false);
      // allow re-upload same file
      event.target.value = "";
    }
  }

  // Logo delete handler
  async function handleLogoDelete() {
    setLogoWorking(true);
    setBanner({ type: "", message: "" });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // List files in the user's folder
      const { data: files, error: listError } = await supabase.storage
        .from("contractor-logos")
        .list(user.id);

      if (listError) throw listError;

      if (files?.length) {
        const filePaths = files.map((f) => `${user.id}/${f.name}`);
        const { error: deleteError } = await supabase.storage
          .from("contractor-logos")
          .remove(filePaths);

        if (deleteError) throw deleteError;
      }

      const { error: dbErr } = await supabase
        .from("contractor_profiles")
        .update({ logo_url: null })
        .eq("id", user.id);

      if (dbErr) throw dbErr;

      setLogoUrl("");
      setBanner({ type: "success", message: "Logo deleted." });
    } catch (err) {
      console.error(err);
      setBanner({ type: "error", message: "Failed to delete logo." });
    } finally {
      setLogoWorking(false);
      setConfirmLogoDeleteOpen(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className={styles.page}>
        <DashboardNavbar />
        <main className={styles.main}>
          <div className={styles.loading}>Loading...</div>
        </main>
      </div>
    );
  }

  const isEditing = Boolean(editingSection);

  return (
    <div className={styles.page}>
      <DashboardNavbar />

      <main className={styles.main}>
        {/* Page Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.brandMark}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className={styles.brandLogo} />
              ) : (
                <div className={styles.brandFallback}>
                  {(companyName || "B").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <h1 className={styles.h1}>
                {companyName ? `${companyName} Profile` : "Company Profile"}
              </h1>
              <p className={styles.subhead}>
                {isAdmin
                  ? "Update your company details used across invoices and client communications."
                  : "View your company details. Contact an admin to make changes."}
              </p>
            </div>
          </div>

          {/* Right-side status */}
          <div className={styles.headerRight}>
            <span className={styles.rolePill}>
              {isAdmin ? "Admin" : "User"}
            </span>
          </div>
        </div>

        {/* Banner */}
        {banner.message ? (
          <div
            className={
              banner.type === "success" ? styles.bannerSuccess : styles.bannerError
            }
          >
            {banner.message}
          </div>
        ) : null}

        {/* Logo Card */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Company Logo</h2>
              <p className={styles.cardSubtitle}>
                Shown on invoices and your client-facing pages.
              </p>
            </div>
          </div>

          <div className={styles.logoRow}>
            <div className={styles.logoBox}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Company Logo" className={styles.logoPreview} />
              ) : (
                <div className={styles.logoPlaceholder}>No logo uploaded</div>
              )}
            </div>

            {isAdmin ? (
              <div className={styles.logoActions}>
                <label className={styles.fileLabel}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className={styles.fileInput}
                    disabled={logoWorking}
                  />
                  <span className={styles.secondaryBtn}>
                    {logoWorking ? "Working..." : "Upload New Logo"}
                  </span>
                </label>

                {logoUrl ? (
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={() => setConfirmLogoDeleteOpen(true)}
                    disabled={logoWorking}
                  >
                    Delete Logo
                  </button>
                ) : null}
              </div>
            ) : (
              <div className={styles.mutedNote}>
                Only admins can upload or delete the logo.
              </div>
            )}
          </div>
        </section>

        {/* Business Information */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Business Information</h2>
              <p className={styles.cardSubtitle}>Company name and trade type.</p>
            </div>

            {isAdmin ? (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => startEdit("business")}
                title="Edit Business Information"
              >
                <FaPencilAlt />
              </button>
            ) : null}
          </div>

          {editingSection === "business" ? (
            <div className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Company Name</label>
                <input
                  className={styles.input}
                  placeholder="Your Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Contracting Trade</label>
                <select
                  className={styles.select}
                  value={contractingTrade}
                  onChange={(e) => setContractingTrade(e.target.value)}
                >
                  <option value="">Select trade</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className={styles.readOnlyGrid}>
              <div className={styles.readOnlyItem}>
                <p className={styles.readOnlyLabel}>Company Name</p>
                <p className={styles.readOnlyValue}>{companyName || "Not set"}</p>
              </div>
              <div className={styles.readOnlyItem}>
                <p className={styles.readOnlyLabel}>Trade</p>
                <p className={styles.readOnlyValue}>
                  {contractingTrade || "Not set"}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Business Address */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Business Address</h2>
              <p className={styles.cardSubtitle}>Used for invoicing and records.</p>
            </div>

            {isAdmin ? (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => startEdit("address")}
                title="Edit Business Address"
              >
                <FaPencilAlt />
              </button>
            ) : null}
          </div>

          {editingSection === "address" ? (
            <div className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Street Address</label>
                <input
                  className={styles.input}
                  placeholder="Street Address"
                  value={addresses[0]?.street || ""}
                  onChange={(e) => {
                    const updated = [...addresses];
                    updated[0] = { ...updated[0], street: e.target.value };
                    setAddresses(updated);
                  }}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Unit / Apt</label>
                <input
                  className={styles.input}
                  placeholder="Unit / Apt"
                  value={addresses[0]?.unit || ""}
                  onChange={(e) => {
                    const updated = [...addresses];
                    updated[0] = { ...updated[0], unit: e.target.value };
                    setAddresses(updated);
                  }}
                />
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>City</label>
                  <input
                    className={styles.input}
                    placeholder="City"
                    value={addresses[0]?.city || ""}
                    onChange={(e) => {
                      const updated = [...addresses];
                      updated[0] = { ...updated[0], city: e.target.value };
                      setAddresses(updated);
                    }}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>State</label>
                  <input
                    className={styles.input}
                    placeholder="State"
                    value={addresses[0]?.state || ""}
                    onChange={(e) => {
                      const updated = [...addresses];
                      updated[0] = { ...updated[0], state: e.target.value };
                      setAddresses(updated);
                    }}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>ZIP Code</label>
                <input
                  className={styles.input}
                  placeholder="ZIP Code"
                  value={addresses[0]?.zip || ""}
                  onChange={(e) => {
                    const updated = [...addresses];
                    updated[0] = { ...updated[0], zip: e.target.value };
                    setAddresses(updated);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className={styles.readOnlyGrid}>
              <div className={styles.readOnlyItemFull}>
                <p className={styles.readOnlyLabel}>Address</p>
                <p className={styles.readOnlyValue}>
                  {addresses[0]?.street || "Not set"}
                  {addresses[0]?.unit ? `, ${addresses[0].unit}` : ""}
                  <br />
                  {addresses[0]?.city || "—"}, {addresses[0]?.state || "—"}{" "}
                  {addresses[0]?.zip || "—"}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Contact Information */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Contact Information</h2>
              <p className={styles.cardSubtitle}>
                Shared with clients and used for notifications.
              </p>
            </div>

            {isAdmin ? (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => startEdit("contact")}
                title="Edit Contact Information"
              >
                <FaPencilAlt />
              </button>
            ) : null}
          </div>

          {editingSection === "contact" ? (
            <div className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Business Phone</label>
                <input
                  className={styles.input}
                  placeholder="Business Phone"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Business Email</label>
                <input
                  className={styles.input}
                  placeholder="Business Email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Website (optional)</label>
                <input
                  className={styles.input}
                  placeholder="Website (optional)"
                  value={businessWebsite}
                  onChange={(e) => setBusinessWebsite(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className={styles.readOnlyGrid}>
              <div className={styles.readOnlyItem}>
                <p className={styles.readOnlyLabel}>Phone</p>
                <p className={styles.readOnlyValue}>{businessPhone || "Not set"}</p>
              </div>
              <div className={styles.readOnlyItem}>
                <p className={styles.readOnlyLabel}>Email</p>
                <p className={styles.readOnlyValue}>{businessEmail || "Not set"}</p>
              </div>
              <div className={styles.readOnlyItemFull}>
                <p className={styles.readOnlyLabel}>Website</p>
                <p className={styles.readOnlyValue}>{businessWebsite || "Not set"}</p>
              </div>
            </div>
          )}
        </section>

        {/* Service Regions */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Service Regions</h2>
              <p className={styles.cardSubtitle}>Areas your team services.</p>
            </div>

            {isAdmin ? (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => startEdit("regions")}
                title="Edit Service Regions"
              >
                <FaPencilAlt />
              </button>
            ) : null}
          </div>

          {editingSection === "regions" ? (
            <div className={styles.form}>
              {serviceRegions.map((region, idx) => (
                <div className={styles.inlineRow} key={idx}>
                  <input
                    className={styles.input}
                    value={region}
                    placeholder="e.g. Detroit Metro"
                    onChange={(e) => {
                      const copy = [...serviceRegions];
                      copy[idx] = e.target.value;
                      setServiceRegions(copy);
                    }}
                  />
                  <button
                    type="button"
                    className={styles.inlineIconBtn}
                    onClick={() =>
                      setServiceRegions(serviceRegions.filter((_, i) => i !== idx))
                    }
                    title="Remove"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}

              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setServiceRegions([...serviceRegions, ""])}
              >
                <FaPlus /> <span>Add Region</span>
              </button>
            </div>
          ) : (
            <div className={styles.readOnlyGrid}>
              <div className={styles.readOnlyItemFull}>
                <p className={styles.readOnlyLabel}>Regions</p>
                <p className={styles.readOnlyValue}>
                  {serviceRegions.length ? serviceRegions.join(", ") : "No regions added"}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Licenses */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Licenses</h2>
              <p className={styles.cardSubtitle}>License numbers and expiration dates.</p>
            </div>

            {isAdmin ? (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => startEdit("licenses")}
                title="Edit Licenses"
              >
                <FaPencilAlt />
              </button>
            ) : null}
          </div>

          {editingSection === "licenses" ? (
            <div className={styles.form}>
              {licenses.map((l, idx) => (
                <div key={idx} className={styles.licenseGrid}>
                  <input
                    className={styles.input}
                    placeholder="License Number"
                    value={l.number}
                    onChange={(e) => {
                      const copy = [...licenses];
                      copy[idx] = { ...copy[idx], number: e.target.value };
                      setLicenses(copy);
                    }}
                  />

                  <input
                    className={styles.input}
                    placeholder="State"
                    value={l.state}
                    onChange={(e) => {
                      const copy = [...licenses];
                      copy[idx] = { ...copy[idx], state: e.target.value };
                      setLicenses(copy);
                    }}
                  />

                  <input
                    className={styles.input}
                    type="date"
                    value={l.expiration || ""}
                    onChange={(e) => {
                      const copy = [...licenses];
                      copy[idx] = { ...copy[idx], expiration: e.target.value };
                      setLicenses(copy);
                    }}
                  />

                  <button
                    type="button"
                    className={styles.inlineIconBtn}
                    onClick={() => setLicenses(licenses.filter((_, i) => i !== idx))}
                    title="Remove"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}

              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() =>
                  setLicenses([...licenses, { number: "", state: "", expiration: "" }])
                }
              >
                <FaPlus /> <span>Add License</span>
              </button>
            </div>
          ) : (
            <div className={styles.readOnlyGrid}>
              <div className={styles.readOnlyItemFull}>
                <p className={styles.readOnlyLabel}>Licenses</p>
                <div className={styles.licenseList}>
                  {licenses.length ? (
                    licenses.map((l, idx) => (
                      <div key={idx} className={styles.licenseLine}>
                        <span className={styles.licenseStrong}>{l.number || "—"}</span>
                        <span className={styles.licenseMuted}>
                          {l.state || "—"}
                          {l.expiration ? ` • expires ${l.expiration}` : " • expires N/A"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className={styles.readOnlyValue}>No licenses added</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Footer actions (only when editing something) */}
        {isEditing ? (
          <div className={styles.footerBar}>
            <button
              type="button"
              className={styles.footerCancel}
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className={styles.footerSave}
              onClick={() => setConfirmSaveOpen(true)}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        ) : null}
      </main>

      {/* Confirm Save */}
      <ConfirmModal
        open={confirmSaveOpen}
        title="Save changes?"
        message="This will update your company profile for everyone on your team."
        confirmLabel="Yes, Save"
        confirmTone="primary"
        onCancel={() => setConfirmSaveOpen(false)}
        onConfirm={saveProfile}
        loading={saving}
      />

      {/* Confirm Logo Delete */}
      <ConfirmModal
        open={confirmLogoDeleteOpen}
        title="Delete logo?"
        message="This will remove your logo from invoices and your profile."
        confirmLabel="Yes, Delete"
        confirmTone="danger"
        onCancel={() => setConfirmLogoDeleteOpen(false)}
        onConfirm={handleLogoDelete}
        loading={logoWorking}
      />
    </div>
  );
}
