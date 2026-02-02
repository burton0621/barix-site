"use client";

/*
  Profile Page
  ------------
  Contractors manage their business information.

  Sections include:
  - Payout Settings (Stripe Connect) - Admin only
  - Business Information - Admin only edit
  - Company Logo - Admin only edit
  - Business Address - Admin only edit
  - Contact Information - Admin only edit
  - Service Regions - Admin only edit
  - Licenses - Admin only edit
*/

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import Toast from "@/components/common/Toast/Toast";
import ConfirmDialog from "@/components/common/ConfirmDialog/ConfirmDialog";
import styles from "./profile.module.css";

import {
  FaPencilAlt,
  FaPlus,
  FaTrash,
  FaUniversity,
  FaCheckCircle,
  FaClock,
  FaBolt,
  FaWallet,
} from "react-icons/fa";

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
              confirmTone === "danger"
                ? styles.modalConfirmDanger
                : styles.modalConfirm
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState(null);

  // MAIN PROFILE FIELDS
  const [companyName, setCompanyName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contractorId, setContractorId] = useState(null);

  // STRIPE CONNECT STATE
  const [stripeStatus, setStripeStatus] = useState({
    connected: false,
    payoutsEnabled: false,
    chargesEnabled: false,
    requirements: null,
    loading: true,
  });
  const [connectingStripe, setConnectingStripe] = useState(false);

  // BALANCE STATE
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

  // UI feedback
  const [banner, setBanner] = useState({ type: "", message: "" }); // "success" | "error" | ""
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmLogoDeleteOpen, setConfirmLogoDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoWorking, setLogoWorking] = useState(false);
  
  // Toast notification state for user-friendly feedback
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });
  
  // Payout confirmation dialog state
  const [payoutConfirm, setPayoutConfirm] = useState({
    open: false,
    amount: 0,
    fee: 0,
    netAmount: 0,
  });
  
  // Helper to show toast notifications
  const showToast = (message, type = "error") => {
    setToast({ open: true, message, type });
  };

  // Stripe callback status in URL params
  useEffect(() => {
    const stripeStatusParam = searchParams.get("stripe_status");
    const stripeError = searchParams.get("stripe_error");

    if (stripeStatusParam === "complete") {
      console.log("Stripe onboarding completed successfully");
    } else if (stripeStatusParam === "pending") {
      console.log("Stripe onboarding incomplete - additional info needed");
    } else if (stripeError) {
      console.error("Stripe onboarding error:", stripeError);
    }
  }, [searchParams]);

  // Fetch the current Stripe Connect status from our API
  async function fetchStripeStatus(userId) {
    try {
      const response = await fetch(
        `/api/stripe/connect/status?contractorId=${userId}`
      );
      const data = await response.json();

      setStripeStatus({
        connected: data.connected || false,
        payoutsEnabled: data.payoutsEnabled || false,
        chargesEnabled: data.chargesEnabled || false,
        requirements: data.requirements || null,
        loading: false,
      });

      if (data.payoutsEnabled) {
        fetchBalance(userId);
      } else {
        setBalance((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("Error fetching Stripe status:", error);
      setStripeStatus((prev) => ({ ...prev, loading: false }));
      setBalance((prev) => ({ ...prev, loading: false }));
    }
  }

  // Fetch the available balance for instant payouts
  async function fetchBalance(userId) {
    try {
      const response = await fetch(
        `/api/stripe/connect/balance?contractorId=${userId}`
      );
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
      setBalance((prev) => ({ ...prev, loading: false }));
    }
  }

  // Process an instant payout
  // Shows the payout confirmation dialog before processing
  function handleInstantPayoutClick() {
    const amount = parseFloat(payoutAmount);

    if (!amount || amount <= 0) {
      showToast("Please enter a valid amount", "warning");
      return;
    }

    if (amount > balance.instantAvailable) {
      showToast(
        `Maximum instant payout amount is $${balance.instantAvailable.toFixed(2)}`,
        "warning"
      );
      return;
    }

    const fee = Math.max(amount * 0.01, 0.5);
    const netAmount = amount - fee;

    // Show user-friendly confirmation dialog
    setPayoutConfirm({
      open: true,
      amount,
      fee,
      netAmount,
    });
  }

  // Actually processes the payout after user confirms
  async function handleConfirmPayout() {
    const { amount } = payoutConfirm;
    setPayoutConfirm({ ...payoutConfirm, open: false });
    setProcessingPayout(true);

    try {
      const response = await fetch("/api/stripe/connect/instant-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId, amount }),
      });

      const data = await response.json();

      if (data.error) {
        showToast("Payout failed: " + data.error);
        return;
      }

      showToast(
        `Payout of $${data.payout.amount.toFixed(2)} initiated. Funds will arrive within minutes.`,
        "success"
      );

      setPayoutAmount("");
      fetchBalance(contractorId);
    } catch (error) {
      console.error("Instant payout error:", error);
      showToast("Failed to process instant payout. Please try again.");
    } finally {
      setProcessingPayout(false);
    }
  }

  // Start Stripe Connect onboarding
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
        showToast("Error setting up payouts: " + data.error);
        return;
      }

      window.location.href = data.onboardingUrl;
    } catch (error) {
      console.error("Error starting Stripe onboarding:", error);
      showToast("Failed to start payout setup. Please try again.");
    } finally {
      setConnectingStripe(false);
    }
  }

  useEffect(() => {
    async function load() {
      setBanner({ type: "", message: "" });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setContractorId(user.id);

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
        setBusinessPhone(profile.business_phone || "");
        setBusinessEmail(profile.business_email || "");
        setBusinessWebsite(profile.business_website || "");
        setLogoUrl(profile.logo_url || "");

        if (profile.stripe_account_id) {
          fetchStripeStatus(user.id);
        } else {
          setStripeStatus((prev) => ({ ...prev, loading: false }));
          setBalance((prev) => ({ ...prev, loading: false }));
        }
      } else {
        setStripeStatus((prev) => ({ ...prev, loading: false }));
        setBalance((prev) => ({ ...prev, loading: false }));
      }

      // Load addresses
      const { data: addressRows } = await supabase
        .from("contractor_addresses")
        .select("*")
        .eq("contractor_id", user.id);

      const normalizedAddresses =
        addressRows && addressRows.length > 0
          ? addressRows
          : [{ street: "", unit: "", city: "", state: "", zip: "" }];

      setAddresses(normalizedAddresses);

      // Load service regions
      const { data: regions } = await supabase
        .from("contractor_service_regions")
        .select("*")
        .eq("contractor_id", user.id);

      setServiceRegions(regions?.map((r) => r.region_name) || []);

      // Load licenses
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
  }, [router]);

  function startEdit(sectionKey) {
    if (!isAdmin) return;
    setBanner({ type: "", message: "" });
    setEditingSection(sectionKey);
  }

  function cancelEdit() {
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
      // 1) Update main profile
      const { error: mainErr } = await supabase
        .from("contractor_profiles")
        .update({
          company_name: companyName,
          business_phone: businessPhone,
          business_email: businessEmail,
          business_website: businessWebsite,
          logo_url: logoUrl,
        })
        .eq("id", user.id);

      if (mainErr) throw mainErr;

      // 2) Replace addresses
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

      // 3) Replace service regions
      const { error: regionDelErr } = await supabase
        .from("contractor_service_regions")
        .delete()
        .eq("contractor_id", user.id);
      if (regionDelErr) throw regionDelErr;

      if (serviceRegions.length > 0) {
        const rows = serviceRegions
          .map((r) => (r || "").trim())
          .filter(Boolean)
          .map((r) => ({ contractor_id: user.id, region_name: r }));

        if (rows.length) {
          const { error: regionInsErr } = await supabase
            .from("contractor_service_regions")
            .insert(rows);
          if (regionInsErr) throw regionInsErr;
        }
      }

      // 4) Replace licenses
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

      const { error: uploadError } = await supabase.storage
        .from("contractor-logos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedErr } = await supabase.storage
        .from("contractor-logos")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);
      if (signedErr) throw signedErr;

      const signedURL = signedUrlData.signedUrl;

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
    <>
      {/* Toast notification for user-friendly feedback */}
      <Toast 
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />
      
      {/* Payout confirmation dialog */}
      <ConfirmDialog
        open={payoutConfirm.open}
        title="Confirm Instant Payout"
        message={`Amount: $${payoutConfirm.amount.toFixed(2)}\nFee (1%): $${payoutConfirm.fee.toFixed(2)}\nYou'll receive: $${payoutConfirm.netAmount.toFixed(2)}\n\nFunds will arrive in minutes.`}
        confirmLabel="Payout Now"
        cancelLabel="Cancel"
        confirmType="primary"
        onConfirm={handleConfirmPayout}
        onCancel={() => setPayoutConfirm({ ...payoutConfirm, open: false })}
      />
      
      <div className={styles.page}>
        <DashboardNavbar />

        <main className={styles.main}>
          {/* Header */}
          <div className={styles.header}>
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

          <div className={styles.headerRight}>
            <span className={styles.rolePill}>{isAdmin ? "Admin" : "User"}</span>
          </div>
        </div>

        {/* Banner */}
        {banner.message ? (
          <div
            className={
              banner.type === "success"
                ? styles.bannerSuccess
                : styles.bannerError
            }
          >
            {banner.message}
          </div>
        ) : null}

        {/* Payout Settings */}
        {isAdmin && (
          <div
            className={`${styles.payoutCard} ${
              stripeStatus.payoutsEnabled
                ? ""
                : stripeStatus.connected
                ? styles.pending
                : styles.notConnected
            }`}
          >
            <div className={styles.payoutHeader}>
              <h2 className={styles.payoutTitle}>
                <FaUniversity style={{ marginRight: 8, verticalAlign: "middle" }} />
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
                  <span style={{ color: "#16a34a" }}>Payouts Enabled</span>
                ) : stripeStatus.connected ? (
                  <span style={{ color: "#d97706" }}>Verification Pending</span>
                ) : (
                  <span style={{ color: "#64748b" }}>Not Connected</span>
                )}
              </div>
            </div>

            {stripeStatus.loading ? (
              <p className={styles.payoutDescription}>Loading payout status...</p>
            ) : stripeStatus.payoutsEnabled ? (
              <>
                <p className={styles.payoutDescription}>
                  <FaCheckCircle style={{ color: "#22c55e", marginRight: 6 }} />
                  Your bank account is connected and you can receive payments from
                  clients.
                </p>

                <div className={styles.balanceSection}>
                  <div className={styles.balanceGrid}>
                    <div className={styles.balanceCard}>
                      <div className={styles.balanceLabel}>
                        <FaWallet style={{ marginRight: 6 }} />
                        Available Balance
                      </div>
                      <div className={styles.balanceAmount}>
                        {balance.loading
                          ? "..."
                          : `$${balance.available.toFixed(2)}`}
                      </div>
                      <div className={styles.balanceSubtext}>Ready for payout</div>
                    </div>

                    <div className={styles.balanceCard}>
                      <div className={styles.balanceLabel}>
                        <FaClock style={{ marginRight: 6 }} />
                        Pending
                      </div>
                      <div className={styles.balanceAmountPending}>
                        {balance.loading
                          ? "..."
                          : `$${balance.pending.toFixed(2)}`}
                      </div>
                      <div className={styles.balanceSubtext}>
                        Processing (2 days)
                      </div>
                    </div>
                  </div>

                  {!balance.loading && balance.available > 0 && (
                    <div className={styles.instantPayoutSection}>
                      <div className={styles.instantPayoutHeader}>
                        <FaBolt style={{ color: "#f59e0b", marginRight: 6 }} />
                        <span className={styles.instantPayoutTitle}>
                          Instant Payout
                        </span>
                        <span className={styles.instantPayoutFee}>
                          1% fee (min $0.50)
                        </span>
                      </div>

                      <p className={styles.instantPayoutDesc}>
                        Get your money in minutes instead of waiting 2 business
                        days.
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
                          onClick={handleInstantPayoutClick}
                          disabled={
                            processingPayout ||
                            !payoutAmount ||
                            parseFloat(payoutAmount) <= 0
                          }
                        >
                          {processingPayout ? "Processing..." : "Cash Out Now"}
                        </button>
                      </div>

                      <div className={styles.maxPayoutNote}>
                        Max instant: ${balance.instantAvailable.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {!balance.loading &&
                    balance.available === 0 &&
                    balance.pending === 0 && (
                      <p className={styles.noBalanceText}>
                        No payments received yet. When clients pay your invoices,
                        the funds will appear here.
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
                  <FaClock style={{ color: "#f59e0b", marginRight: 6 }} />
                  Your account is being verified. If additional information is
                  needed, click below to continue setup.
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
                  When clients pay invoices, the money is deposited directly into
                  your bank account.
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

        {/* Company Logo */}
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
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className={styles.logoPreview}
                />
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
            </div>
          ) : (
            <div className={styles.readOnlyGrid}>
              <div className={styles.readOnlyItem}>
                <p className={styles.readOnlyLabel}>Company Name</p>
                <p className={styles.readOnlyValue}>{companyName || "Not set"}</p>
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
                <p className={styles.readOnlyValue}>
                  {businessWebsite || "Not set"}
                </p>
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
                  {serviceRegions.length
                    ? serviceRegions.join(", ")
                    : "No regions added"}
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
              <p className={styles.cardSubtitle}>
                License numbers and expiration dates.
              </p>
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
                    onClick={() =>
                      setLicenses(licenses.filter((_, i) => i !== idx))
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
                        <span className={styles.licenseStrong}>
                          {l.number || "—"}
                        </span>
                        <span className={styles.licenseMuted}>
                          {l.state || "—"}
                          {l.expiration
                            ? ` • expires ${l.expiration}`
                            : " • expires N/A"}
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

        {/* Footer actions */}
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
    </>
  );
}
