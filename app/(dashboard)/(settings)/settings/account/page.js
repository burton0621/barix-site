"use client";

/*
  Settings Page
  -------------
  Account settings for logged-in users. This is separate from the
  Profile page which handles business information.
  
  Settings include:
  - Password change (available to all users)
  - Account status (admin only) - shows free demo mode
  - Account deletion (admin only)
  
  FREE DEMO MODE: No subscription required. Only Stripe processing fees apply.
*/

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";


import styles from "../settings.module.css";

export default function SettingsPage() {
  const router = useRouter();
  const { session, membership, isAdmin, isLoading, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [contractorId, setContractorId] = useState(null);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  /*
    Check if user is authenticated
  */
  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.push("/login");
      } else {
        const cId = membership?.contractor_id || session.user.id;
        setContractorId(cId);
        setLoading(false);
      }
    }
  }, [isLoading, session, membership, router]);

  // Handle account deletion - cancels Stripe and deletes all data
  async function handleDeleteAccount() {
    if (!contractorId || !session?.user?.id) return;

    if (deleteConfirmPhrase !== "DELETE MY ACCOUNT") {
      setDeleteError("Please type 'DELETE MY ACCOUNT' exactly to confirm");
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId,
          userId: session.user.id,
          confirmPhrase: deleteConfirmPhrase,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setDeleteError(data.error);
        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();
      router.push("/?deleted=true");
    } catch (error) {
      console.error("Delete error:", error);
      setDeleteError("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  }

  /*
    Handle password change
  */
  async function handlePasswordChange(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordError(error.message);
      setChangingPassword(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordSuccess("Password updated successfully.");
    setChangingPassword(false);
  }

  if (loading || isLoading) {
    return (
      <div className={styles.loadingWrapper}>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  const planName = profile?.selected_plan
    ? `${profile.selected_plan.charAt(0).toUpperCase() + profile.selected_plan.slice(1)} Plan`
    : "Free Demo";

  return (
    <div className={styles.page}>

      <main className={styles.container}>
        {/* Page Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>
            {isAdmin ? "Manage your account settings and subscription" : "Manage your account settings"}
          </p>
        </div>

        {/* Account Status Section - Admin Only */}
        {isAdmin && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Account Status</h2>
            <p className={styles.cardSubtitle}>Your Barix Billing account information.</p>

            <div className={styles.statusBox}>
              <div className={styles.statusHeader}>
                <div>
                  <h3 className={styles.statusPlan}>{planName}</h3>
                  <p className={styles.statusDesc}>Free during demo - you have full access to all features.</p>
                </div>
                <span className={styles.activePill}>Active</span>
              </div>

              <div className={styles.statusDivider}>
                <p className={styles.whatsIncluded}>Whats included:</p>
                <ul className={styles.featureList}>
                  {FEATURES.map((text) => (
                    <li key={text} className={styles.featureItem}>
                      <CheckIcon className={styles.checkIcon} />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.processingBox}>
                <p className={styles.processingText}>
                  <span className={styles.processingStrong}>Payment Processing:</span> Only standard Stripe fees apply
                  (2.9% + $0.30 for cards). Barix does not charge any additional platform fees during the demo period.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Password Change Section */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Change Password</h2>
          <p className={styles.cardSubtitle}>Update your password to keep your account secure.</p>

          <form onSubmit={handlePasswordChange} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={styles.input}
                required
              />
            </div>

            {passwordError && <p className={styles.errorText}>{passwordError}</p>}
            {passwordSuccess && <p className={styles.successText}>{passwordSuccess}</p>}

            <button type="submit" disabled={changingPassword} className={styles.primaryButton}>
              {changingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>

        {/* Danger Zone - Admin Only */}
        {isAdmin && (
          <section className={`${styles.card} ${styles.dangerCard}`}>
            <h2 className={styles.dangerTitle}>Danger Zone</h2>
            <p className={styles.cardSubtitle}>Irreversible actions that affect your account.</p>

            {!showDeleteConfirm ? (
              <div className={styles.dangerRow}>
                <div>
                  <p className={styles.dangerRowTitle}>Delete Account</p>
                  <p className={styles.dangerRowDesc}>Permanently delete your account and all data.</p>
                </div>
                <button onClick={() => setShowDeleteConfirm(true)} className={styles.outlineDangerButton}>
                  Delete Account
                </button>
              </div>
            ) : (
              <div className={styles.confirmBox}>
                <p className={styles.confirmTitle}>Are you absolutely sure?</p>
                <p className={styles.confirmDesc}>
                  This will permanently delete your account, cancel your subscription, and remove all your data including
                  invoices, clients, and services. This action cannot be undone.
                </p>

                <label className={styles.confirmLabel}>
                  Type <span className={styles.monoChip}>DELETE MY ACCOUNT</span> to confirm:
                </label>

                <input
                  type="text"
                  value={deleteConfirmPhrase}
                  onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className={styles.dangerInput}
                  disabled={deleting}
                />

                {deleteError && <p className={styles.errorText}>{deleteError}</p>}

                <div className={styles.buttonRow}>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmPhrase !== "DELETE MY ACCOUNT"}
                    className={styles.solidDangerButton}
                  >
                    {deleting ? "Deleting..." : "Permanently Delete Account"}
                  </button>

                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmPhrase("");
                      setDeleteError("");
                    }}
                    disabled={deleting}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Info for non-admins */}
        {!isAdmin && (
          <section className={styles.infoCard}>
            <p className={styles.infoText}>
              <span className={styles.infoStrong}>Looking for subscription or account settings?</span>{" "}
              Contact your team administrator to manage billing and company-wide settings.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

const FEATURES = [
  "Unlimited invoices and estimates",
  "Unlimited clients",
  "Accept online payments",
  "Team members included",
  "Direct bank payouts via Stripe Connect",
];

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
