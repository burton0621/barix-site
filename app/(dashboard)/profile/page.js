"use client";

/*
  Profile Page
  ------------
  This is where contractors manage their business information.
  After signing up and logging in, users land here to set up their profile
  before they can start invoicing.
  
  Sections include:
  - Payout Settings (Stripe Connect) - Admin only, for receiving payments
  - Business Information (company name, trade type) - Admin only edit
  - Company Logo (upload/delete) - Admin only edit
  - Business Address - Admin only edit
  - Contact Information (phone, email, website) - Admin only edit
  - Service Regions (areas they work in) - Admin only edit
  - Licenses (contractor license numbers and expiration) - Admin only edit
  
  Regular users can view all this information but cannot edit it.
  This is company-level data that only admins should modify.
*/

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./profile.module.css";
import { FaPencilAlt, FaPlus, FaTrash, FaUniversity, FaCheckCircle, FaClock, FaBolt, FaWallet } from "react-icons/fa";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import { useRouter, useSearchParams } from "next/navigation";

export default function ProfilePage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState(null);

  // MAIN PROFILE FIELDS
  const [companyName, setCompanyName] = useState("");
  const [contractingTrade, setContractingTrade] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contractorId, setContractorId] = useState(null);

  // STRIPE CONNECT STATE - for payout settings
  const [stripeStatus, setStripeStatus] = useState({
    connected: false,
    payoutsEnabled: false,
    chargesEnabled: false,
    loading: true,
  });
  const [connectingStripe, setConnectingStripe] = useState(false);
  
  // BALANCE STATE - for showing available funds and instant payout
  const [balance, setBalance] = useState({
    available: 0,
    pending: 0,
    instantAvailable: 0,
    instantPayoutEnabled: false,
    loading: true,
  });
  const [processingPayout, setProcessingPayout] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");

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

  // Check for Stripe callback status in URL params
  useEffect(() => {
    const stripeStatusParam = searchParams.get("stripe_status");
    const stripeError = searchParams.get("stripe_error");

    if (stripeStatusParam === "complete") {
      // Show a success message or update UI
      console.log("Stripe onboarding completed successfully");
    } else if (stripeStatusParam === "pending") {
      console.log("Stripe onboarding incomplete - additional info needed");
    } else if (stripeError) {
      console.error("Stripe onboarding error:", stripeError);
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      setContractorId(user.id);

      // Load main contractor profile
      const { data: profile } = await supabase
        .from("contractor_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setCompanyName(profile.company_name || "");
        setContractingTrade(profile.contracting_trade || "");
        setBusinessPhone(profile.business_phone || "");
        setBusinessEmail(profile.business_email || "");
        setBusinessWebsite(profile.business_website || "");
        setLogoUrl(profile.logo_url || "");

        // If we have a Stripe account ID, fetch the current status
        if (profile.stripe_account_id) {
          fetchStripeStatus(user.id);
        } else {
          setStripeStatus(prev => ({ ...prev, loading: false }));
        }
      } else {
        setStripeStatus(prev => ({ ...prev, loading: false }));
      }

      // Load ADDRESSES
      const { data: addressRows } = await supabase
        .from("contractor_addresses")
        .select("*")
        .eq("contractor_id", user.id);

      setAddresses(addressRows || []);

      if (!addressRows || addressRows.length === 0) {
        setAddresses([{ street: "", unit: "", city: "", state: "", zip: "" }]);
      }

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
          number: l.license_number || "",
          state: l.license_state || "",
          expiration: l.license_expiration || "",
        })) || []
      );

      setLoading(false);
    }

    load();
  }, []);

  // Fetch the current Stripe Connect status from our API
  async function fetchStripeStatus(userId) {
    try {
      const response = await fetch(`/api/stripe/connect/status?contractorId=${userId}`);
      const data = await response.json();
      
      setStripeStatus({
        connected: data.connected || false,
        payoutsEnabled: data.payoutsEnabled || false,
        chargesEnabled: data.chargesEnabled || false,
        requirements: data.requirements || null,
        loading: false,
      });

      // If payouts are enabled, also fetch the balance
      if (data.payoutsEnabled) {
        fetchBalance(userId);
      } else {
        setBalance(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("Error fetching Stripe status:", error);
      setStripeStatus(prev => ({ ...prev, loading: false }));
      setBalance(prev => ({ ...prev, loading: false }));
    }
  }

  // Fetch the available balance for instant payouts
  async function fetchBalance(userId) {
    try {
      const response = await fetch(`/api/stripe/connect/balance?contractorId=${userId}`);
      const data = await response.json();
      
      setBalance({
        available: data.available || 0,
        pending: data.pending || 0,
        instantAvailable: data.instantAvailable || 0,
        instantPayoutEnabled: data.instantPayoutEnabled || false,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(prev => ({ ...prev, loading: false }));
    }
  }

  // Process an instant payout to the contractor's debit card
  async function handleInstantPayout() {
    const amount = parseFloat(payoutAmount);
    
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount > balance.instantAvailable) {
      alert(`Maximum instant payout amount is $${balance.instantAvailable.toFixed(2)}`);
      return;
    }

    // Calculate and show the fee before confirming
    const fee = Math.max(amount * 0.01, 0.50);
    const netAmount = amount - fee;
    
    const confirmed = window.confirm(
      `Instant Payout Summary:\n\n` +
      `Amount: $${amount.toFixed(2)}\n` +
      `Fee (1%): $${fee.toFixed(2)}\n` +
      `You'll receive: $${netAmount.toFixed(2)}\n\n` +
      `Funds will arrive in minutes. Continue?`
    );

    if (!confirmed) return;

    setProcessingPayout(true);
    
    try {
      const response = await fetch("/api/stripe/connect/instant-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId,
          amount,
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert("Payout failed: " + data.error);
        setProcessingPayout(false);
        return;
      }

      alert(
        `Instant payout successful!\n\n` +
        `Amount: $${data.payout.amount.toFixed(2)}\n` +
        `Fee: $${data.payout.fee.toFixed(2)}\n` +
        `Funds should arrive within minutes.`
      );

      // Clear the input and refresh the balance
      setPayoutAmount("");
      fetchBalance(contractorId);
    } catch (error) {
      console.error("Instant payout error:", error);
      alert("Failed to process instant payout. Please try again.");
    }

    setProcessingPayout(false);
  }

  // Start the Stripe Connect onboarding process
  // This creates a connected account and redirects the user to Stripe's hosted onboarding
  async function startStripeOnboarding() {
    if (!contractorId) return;

    setConnectingStripe(true);
    try {
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId,
          email: businessEmail,
          companyName,
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert("Error setting up payouts: " + data.error);
        setConnectingStripe(false);
        return;
      }

      // Redirect to Stripe's onboarding page
      // After they complete it, Stripe will redirect back to our callback URL
      window.location.href = data.onboardingUrl;
    } catch (error) {
      console.error("Error starting Stripe onboarding:", error);
      alert("Failed to start payout setup. Please try again.");
      setConnectingStripe(false);
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
        company_name: companyName,
        contracting_trade: contractingTrade,
        business_phone: businessPhone,
        business_email: businessEmail,
        business_website: businessWebsite,
        logo_url: logoUrl,
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
      const a = addresses[0];
      await supabase.from("contractor_addresses").insert({
        contractor_id: user.id,
        street: a.street,
        unit: a.unit,
        city: a.city,
        state: a.state,
        zip: a.zip,
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

  //Logo upload handler
  async function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const { data: { user } } = await supabase.auth.getUser();

  const fileExt = file.name.split(".").pop();
  const newFileName = `logo.${fileExt}`;
  const filePath = `${user.id}/${newFileName}`;

  // Upload file
  const { error: uploadError } = await supabase.storage
    .from("contractor-logos")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    alert("Failed to upload logo");
    console.error(uploadError);
    return;
  }

  // Create signed URL (valid 1 year)
  const { data: signedUrlData } = await supabase.storage
    .from("contractor-logos")
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  const signedURL = signedUrlData.signedUrl;

  // Save URL to profile table
  await supabase
    .from("contractor_profiles")
    .update({ logo_url: signedURL })
    .eq("id", user.id);

  // Update UI
  setLogoUrl(signedURL);
}

//logo delete handler   
async function handleLogoDelete() {
  const confirmDelete = window.confirm("Delete your company logo?");
  if (!confirmDelete) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // All logos follow the pattern: contractor-logos/{user_id}/logo.png
  const folderPrefix = `${user.id}/`;

  // List files in the user's folder
  const { data: files, error: listError } = await supabase.storage
    .from("contractor-logos")
    .list(user.id);

  if (listError) {
    console.error("Error listing files:", listError);
    return;
  }

  if (files.length === 0) {
    console.warn("No logo found to delete.");
    return;
  }

  // Delete all files in the user's folder (usually only 1)
  const filePaths = files.map((f) => `${user.id}/${f.name}`);

  const { error: deleteError } = await supabase.storage
    .from("contractor-logos")
    .remove(filePaths);

  if (deleteError) {
    console.error("Error deleting logo:", deleteError);
    return;
  }

  // Clear the DB reference
  await supabase
    .from("contractor_profiles")
    .update({ logo_url: null })
    .eq("id", user.id);

  setLogoUrl(null);
}





  if (loading) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <div>
      <DashboardNavbar />
      <div className={styles.container}>
        <div className={styles.headerRow}>
            {logoUrl && (
                <img src={logoUrl} alt="Logo" className={styles.headerLogo} />
            )}

            <h1 className={styles.title}>
                {companyName ? `${companyName} Profile` : "Contractor Profile"}
            </h1>
        </div>

      {/* ---------------- PAYOUT SETTINGS (Stripe Connect) ---------------- */}
      {/* This section allows contractors to connect their bank account to receive payments */}
      {isAdmin && (
        <div className={`${styles.payoutCard} ${
          stripeStatus.payoutsEnabled 
            ? '' 
            : stripeStatus.connected 
              ? styles.pending 
              : styles.notConnected
        }`}>
          <div className={styles.payoutHeader}>
            <h2 className={styles.payoutTitle}>
              <FaUniversity style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Payout Settings
            </h2>
            <div className={styles.payoutStatus}>
              <span 
                className={`${styles.statusDot} ${
                  stripeStatus.payoutsEnabled 
                    ? styles.enabled 
                    : stripeStatus.connected 
                      ? styles.pending 
                      : styles.notConnected
                }`}
              />
              {stripeStatus.loading ? (
                "Checking..."
              ) : stripeStatus.payoutsEnabled ? (
                <span style={{ color: '#16a34a' }}>Payouts Enabled</span>
              ) : stripeStatus.connected ? (
                <span style={{ color: '#d97706' }}>Verification Pending</span>
              ) : (
                <span style={{ color: '#64748b' }}>Not Connected</span>
              )}
            </div>
          </div>

          {stripeStatus.loading ? (
            <p className={styles.payoutDescription}>Loading payout status...</p>
          ) : stripeStatus.payoutsEnabled ? (
            <>
              <p className={styles.payoutDescription}>
                <FaCheckCircle style={{ color: '#22c55e', marginRight: 6 }} />
                Your bank account is connected and you can receive payments from clients.
              </p>

              {/* Balance Display Section */}
              <div className={styles.balanceSection}>
                <div className={styles.balanceGrid}>
                  <div className={styles.balanceCard}>
                    <div className={styles.balanceLabel}>
                      <FaWallet style={{ marginRight: 6 }} />
                      Available Balance
                    </div>
                    <div className={styles.balanceAmount}>
                      {balance.loading ? "..." : `$${balance.available.toFixed(2)}`}
                    </div>
                    <div className={styles.balanceSubtext}>Ready for payout</div>
                  </div>
                  
                  <div className={styles.balanceCard}>
                    <div className={styles.balanceLabel}>
                      <FaClock style={{ marginRight: 6 }} />
                      Pending
                    </div>
                    <div className={styles.balanceAmountPending}>
                      {balance.loading ? "..." : `$${balance.pending.toFixed(2)}`}
                    </div>
                    <div className={styles.balanceSubtext}>Processing (2 days)</div>
                  </div>
                </div>

                {/* Instant Payout Section - only show if there's available balance */}
                {!balance.loading && balance.available > 0 && (
                  <div className={styles.instantPayoutSection}>
                    <div className={styles.instantPayoutHeader}>
                      <FaBolt style={{ color: '#f59e0b', marginRight: 6 }} />
                      <span className={styles.instantPayoutTitle}>Instant Payout</span>
                      <span className={styles.instantPayoutFee}>1% fee (min $0.50)</span>
                    </div>
                    <p className={styles.instantPayoutDesc}>
                      Get your money in minutes instead of waiting 2 business days.
                    </p>
                    <div className={styles.instantPayoutForm}>
                      <div className={styles.payoutInputGroup}>
                        <span className={styles.currencySymbol}>$</span>
                        <input
                          type="number"
                          className={styles.payoutInput}
                          placeholder="0.00"
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          max={balance.instantAvailable}
                          step="0.01"
                          disabled={processingPayout}
                        />
                      </div>
                      <button
                        className={styles.instantPayoutBtn}
                        onClick={handleInstantPayout}
                        disabled={processingPayout || !payoutAmount || parseFloat(payoutAmount) <= 0}
                      >
                        {processingPayout ? "Processing..." : "Cash Out Now"}
                      </button>
                    </div>
                    <div className={styles.maxPayoutNote}>
                      Max instant: ${balance.instantAvailable.toFixed(2)}
                    </div>
                  </div>
                )}

                {/* No balance message */}
                {!balance.loading && balance.available === 0 && balance.pending === 0 && (
                  <p className={styles.noBalanceText}>
                    No payments received yet. When clients pay your invoices, the funds will appear here.
                  </p>
                )}
              </div>

              <button
                className={`${styles.payoutBtn} ${styles.secondary}`}
                onClick={startStripeOnboarding}
                disabled={connectingStripe}
                style={{ marginTop: 16 }}
              >
                Update Payout Settings
              </button>
            </>
          ) : stripeStatus.connected ? (
            <>
              <p className={styles.payoutDescription}>
                <FaClock style={{ color: '#f59e0b', marginRight: 6 }} />
                Your account is being verified. This usually takes a few minutes.
                If additional information is needed, click below to continue setup.
              </p>
              <button
                className={styles.payoutBtn}
                onClick={startStripeOnboarding}
                disabled={connectingStripe}
              >
                {connectingStripe ? "Redirecting..." : "Continue Setup"}
              </button>
            </>
          ) : (
            <>
              <p className={styles.payoutDescription}>
                Connect your bank account to receive payments from clients.
                When clients pay invoices, the money will be deposited directly
                into your bank account.
              </p>
              <button
                className={styles.payoutBtn}
                onClick={startStripeOnboarding}
                disabled={connectingStripe}
              >
                {connectingStripe ? "Redirecting..." : "Set Up Payouts"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ---------------- BUSINESS INFORMATION ---------------- */}
        <div className={styles.card}>
        <div className={styles.row}>
            <h2>Business Information</h2>
            {isAdmin && <FaPencilAlt className={styles.icon} onClick={() => setEditingSection("business")} />}
        </div>

        {editingSection === "business" ? (
            <>
            <label className={styles.label}>Company Name</label>
            <input
                className={styles.input}
                placeholder="Your Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
            />

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
            <>
            <p><strong>Company Name:</strong> {companyName || "Not set"}</p>
            <p><strong>Trade:</strong> {contractingTrade || "Not set"}</p>
            </>
        )}
        </div>


        {/* ---------------- COMPANY LOGO ---------------- */}
        <div className={styles.logoSection}>
        {logoUrl ? (
            <img src={logoUrl} alt="Company Logo" className={styles.logoPreview} />
        ) : (
            <div className={styles.logoPlaceholder}>No logo uploaded</div>
        )}

        {/* Logo upload and delete - admin only */}
        {isAdmin && (
          <>
            <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className={styles.fileInput}
            />

            {logoUrl && (
                <button className={styles.deleteLogoBtn} onClick={handleLogoDelete}>
                Delete Logo
                </button>
            )}
          </>
        )}
        </div>



      {/* ---------------- BUSINESS ADDRESS ---------------- */}
      <div className={styles.card}>
        <div className={styles.row}>
          <h2>Business Address</h2>
          {isAdmin && <FaPencilAlt className={styles.icon} onClick={() => setEditingSection("address")} />}
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
          {isAdmin && <FaPencilAlt className={styles.icon} onClick={() => setEditingSection("contact")} />}
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
          {isAdmin && <FaPencilAlt className={styles.icon} onClick={() => setEditingSection("regions")} />}
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
          {isAdmin && <FaPencilAlt className={styles.icon} onClick={() => setEditingSection("licenses")} />}
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

      {/* SAVE BUTTON */}
      {editingSection && (
        <button className={styles.saveBtn} onClick={saveProfile}>
          Save Changes
        </button>
      )}
    </div>
    </div>
  );
}

