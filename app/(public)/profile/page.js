"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./profile.module.css";
import { FaPencilAlt, FaPlus, FaTrash } from "react-icons/fa";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState(null);

  // MAIN PROFILE FIELDS
  const [contractingTrade, setContractingTrade] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [jobCategories, setJobCategories] = useState([]);

  // RELATIONAL TABLE STATES
  const [addresses, setAddresses] = useState([]);
  const [serviceRegions, setServiceRegions] = useState([]);
  const [licenses, setLicenses] = useState([]);

  const BUSINESS_TYPES = [
    "HVAC",
    "Lawn Care",
    "Plumbing",
    "Roofing",
    "Painting",
    "Carpentry",
    "Electrical",
    "General Contracting",
  ];

  const CATEGORY_OPTIONS = BUSINESS_TYPES;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Load main contractor profile
      const { data: profile } = await supabase
        .from("contractor_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setContractingTrade(profile.contracting_trade || "");
        setBusinessPhone(profile.business_phone || "");
        setBusinessEmail(profile.business_email || "");
        setBusinessWebsite(profile.business_website || "");
        setLogoUrl(profile.logo_url || "");
        setJobCategories(profile.job_categories || []);
      }

      // Load ADDRESSES
      const { data: addressRows } = await supabase
        .from("contractor_addresses")
        .select("*")
        .eq("contractor_id", user.id);

      setAddresses(addressRows || []);

      // Load SERVICE REGIONS
      const { data: regions } = await supabase
        .from("contractor_service_regions")
        .select("*")
        .eq("contractor_id", user.id);

      setServiceRegions(regions?.map(r => r.region_name) || []);

      // Load LICENSES
      const { data: licenseRows } = await supabase
        .from("contractor_licenses")
        .select("*")
        .eq("contractor_id", user.id);

      setLicenses(
        licenseRows?.map(l => ({
          number: l.license_number,
          state: l.license_state,
          expiration: l.license_expiration,
        })) || []
      );

      // If no address exists, initialize an empty one (for UI)
      if (!addressRows || addressRows.length === 0) {
        setAddresses([
          { street: "", unit: "", city: "", state: "", zip: "" }
        ]);
      }

      setLoading(false);
    }

    load();
  }, []);

  function toggleCategory(cat) {
    if (jobCategories.includes(cat)) {
      setJobCategories(jobCategories.filter(c => c !== cat));
    } else {
      setJobCategories([...jobCategories, cat]);
    }
  }

  async function saveProfile() {
    const confirmSave = window.confirm("Save your profile changes?");
    if (!confirmSave) return;

    const { data: { user } } = await supabase.auth.getUser();

    /* -------------------------------
       1. UPDATE MAIN PROFILE
    --------------------------------*/
    await supabase
      .from("contractor_profiles")
      .update({
        contracting_trade: contractingTrade,
        business_phone: businessPhone,
        business_email: businessEmail,
        business_website: businessWebsite,
        logo_url: logoUrl,
        job_categories: jobCategories,
      })
      .eq("id", user.id);

    /* -------------------------------
       2. REPLACE ADDRESSES
    --------------------------------*/
    await supabase
      .from("contractor_addresses")
      .delete()
      .eq("contractor_id", user.id);

    if (addresses.length > 0) {
      const addr = addresses[0];
      await supabase.from("contractor_addresses").insert({
        contractor_id: user.id,
        street: addr.street,
        unit: addr.unit,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        country: "USA"
      });
    }

    /* -------------------------------
       3. REPLACE SERVICE REGIONS
    --------------------------------*/
    await supabase
      .from("contractor_service_regions")
      .delete()
      .eq("contractor_id", user.id);

    if (serviceRegions.length > 0) {
      const rows = serviceRegions.map(r => ({
        contractor_id: user.id,
        region_name: r
      }));
      await supabase.from("contractor_service_regions").insert(rows);
    }

    /* -------------------------------
       4. REPLACE LICENSES
    --------------------------------*/
    await supabase
      .from("contractor_licenses")
      .delete()
      .eq("contractor_id", user.id);

    if (licenses.length > 0) {
      const rows = licenses.map(l => ({
        contractor_id: user.id,
        license_number: l.number,
        license_state: l.state,
        license_expiration: l.expiration || null,
      }));
      await supabase.from("contractor_licenses").insert(rows);
    }

    alert("Profile updated!");
    setEditingSection(null);
  }

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Contractor Profile</h1>

      {/* ---------------- BUSINESS INFORMATION ---------------- */}
      <div className={styles.card}>
        <div className={styles.row}>
          <h2>Business Information</h2>
          <FaPencilAlt className={styles.icon} onClick={() => setEditingSection("business")} />
        </div>

        {editingSection === "business" ? (
          <>
            <label className={styles.label}>Contracting Trade</label>
            <select
              className={styles.select}
              value={contractingTrade}
              onChange={(e) => setContractingTrade(e.target.value)}
            >
              <option value="">Select trade</option>
              {BUSINESS_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </>
        ) : (
          <p><strong>Trade:</strong> {contractingTrade || "Not set"}</p>
        )}
      </div>

      {/* ---------------- BUSINESS ADDRESS ---------------- */}
      <div className={styles.card}>
        <div className={styles.row}>
          <h2>Business Address</h2>
          <FaPencilAlt className={styles.icon} onClick={() => setEditingSection("address")} />
        </div>

        {editingSection === "address" ? (
          <>
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

            <div className={styles.grid2}>
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
          </>
        ) : (
          <p className={styles.value}>
            {addresses[0]?.street || "Not set"}
            {addresses[0]?.unit ? `, ${addresses[0].unit}` : ""}
            <br />
            {addresses[0]?.city}, {addresses[0]?.state} {addresses[0]?.zip}
          </p>
        )}
      </div>

      {/* ---------------- CONTACT INFORMATION ---------------- */}
      <div className={styles.card}>
        <div className={styles.row}>
          <h2>Contact Information</h2>
          <FaPencilAlt className={styles.icon} onClick={() => setEditingSection("contact")} />
        </div>

        {editingSection === "contact" ? (
          <>
            <input
              className={styles.input}
              placeholder="Business Phone"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
            />
            <input
              className={styles.input}
              placeholder="Business Email"
              value={businessEmail}
              onChange={(e) => setBusinessEmail(e.target.value)}
            />
            <input
              className={styles.input}
              placeholder="Website (optional)"
              value={businessWebsite}
              onChange={(e) => setBusinessWebsite(e.target.value)}
            />
          </>
        ) : (
          <>
            <p><strong>Phone:</strong> {businessPhone || "Not set"}</p>
            <p><strong>Email:</strong> {businessEmail || "Not set"}</p>
            <p><strong>Website:</strong> {businessWebsite || "Not set"}</p>
          </>
        )}
      </div>

      {/* ---------------- SERVICE REGIONS ---------------- */}
      <div className={styles.card}>
        <div className={styles.row}>
          <h2>Service Regions</h2>
          <FaPencilAlt className={styles.icon} onClick={() => setEditingSection("regions")} />
        </div>

        {editingSection === "regions" ? (
          <>
            {serviceRegions.map((region, idx) => (
              <div className={styles.regionRow} key={idx}>
                <input
                  className={styles.input}
                  value={region}
                  onChange={(e) => {
                    const copy = [...serviceRegions];
                    copy[idx] = e.target.value;
                    setServiceRegions(copy);
                  }}
                />
                <FaTrash
                  className={styles.icon}
                  onClick={() =>
                    setServiceRegions(serviceRegions.filter((_, i) => i !== idx))
                  }
                />
              </div>
            ))}

            <button
              className={styles.addBtn}
              onClick={() => setServiceRegions([...serviceRegions, ""])}
            >
              <FaPlus /> Add Region
            </button>
          </>
        ) : (
          <p>{serviceRegions.length ? serviceRegions.join(", ") : "No regions added"}</p>
        )}
      </div>

      {/* ---------------- LICENSES ---------------- */}
      <div className={styles.card}>
        <div className={styles.row}>
          <h2>Licenses</h2>
          <FaPencilAlt className={styles.icon} onClick={() => setEditingSection("licenses")} />
        </div>

        {editingSection === "licenses" ? (
          <>
            {licenses.map((l, idx) => (
              <div key={idx} className={styles.licenseBlock}>
                <input
                  className={styles.input}
                  placeholder="License Number"
                  value={l.number}
                  onChange={(e) => {
                    const copy = [...licenses];
                    copy[idx].number = e.target.value;
                    setLicenses(copy);
                  }}
                />
                <input
                  className={styles.input}
                  placeholder="State"
                  value={l.state}
                  onChange={(e) => {
                    const copy = [...licenses];
                    copy[idx].state = e.target.value;
                    setLicenses(copy);
                  }}
                />
                <input
                  className={styles.input}
                  type="date"
                  value={l.expiration || ""}
                  onChange={(e) => {
                    const copy = [...licenses];
                    copy[idx].expiration = e.target.value;
                    setLicenses(copy);
                  }}
                />
                <FaTrash
                  className={styles.icon}
                  onClick={() =>
                    setLicenses(licenses.filter((_, i) => i !== idx))
                  }
                />
              </div>
            ))}

            <button
              className={styles.addBtn}
              onClick={() =>
                setLicenses([
                  ...licenses,
                  { number: "", state: "", expiration: "" },
                ])
              }
            >
              <FaPlus /> Add License
            </button>
          </>
        ) : (
          <>
            {licenses.length ? (
              licenses.map((l, idx) => (
                <p key={idx}>
                  {l.number} — {l.state} (expires {l.expiration || "N/A"})
                </p>
              ))
            ) : (
              <p>No licenses added</p>
            )}
          </>
        )}
      </div>

      {/* ---------------- JOB CATEGORIES ---------------- */}
      <div className={styles.card}>
        <div className={styles.row}>
          <h2>Job Categories</h2>
          <FaPencilAlt className={styles.icon} onClick={() => setEditingSection("categories")} />
        </div>

        {editingSection === "categories" ? (
          <div className={styles.categoryList}>
            {CATEGORY_OPTIONS.map(cat => (
              <div key={cat} className={styles.categoryItem}>
                <input
                  type="checkbox"
                  checked={jobCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                />
                <label>{cat}</label>
              </div>
            ))}
          </div>
        ) : (
          <p>{jobCategories.length ? jobCategories.join(", ") : "None selected"}</p>
        )}
      </div>

      {/* SAVE BUTTON */}
      {editingSection && (
        <button className={styles.saveBtn} onClick={saveProfile}>
          Save Changes
        </button>
      )}
    </div>
  );
}
