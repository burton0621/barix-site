"use client";

/*
  Settings Page
  -------------
  Account settings for logged-in users. This is separate from the
  Profile page which handles business information.
  
  Settings include:
  - Password change (available to all users)
  - Subscription management (admin only) - now with Stripe integration
  - Account deletion (admin only)
  
  The subscription section shows:
  - Current plan status (active, trialing, past_due, canceled)
  - Days remaining in trial
  - Subscribe button (if no subscription)
  - Manage Subscription button (opens Stripe portal)
*/

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, membership, isAdmin, isLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [contractorId, setContractorId] = useState(null);
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Subscription state
  const [subscription, setSubscription] = useState({
    status: 'none',
    hasAccess: false,
    isTrialing: false,
    daysRemaining: 0,
    loading: true,
  });
  const [subscribing, setSubscribing] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Check for success/cancel from Stripe redirect
  useEffect(() => {
    const subscriptionParam = searchParams.get("subscription");
    if (subscriptionParam === "success") {
      // They just subscribed, refresh the status
      console.log("Subscription successful, refreshing status...");
    } else if (subscriptionParam === "canceled") {
      console.log("Subscription checkout was canceled");
    }
  }, [searchParams]);

  /*
    Check if user is authenticated and load subscription status
  */
  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.push("/login");
      } else {
        // Get the contractor ID from membership or directly from user
        const cId = membership?.contractor_id || session.user.id;
        setContractorId(cId);
        fetchSubscriptionStatus(cId);
        setLoading(false);
      }
    }
  }, [isLoading, session, membership, router]);

  // Fetch subscription status from our API
  async function fetchSubscriptionStatus(cId) {
    try {
      const response = await fetch(`/api/stripe/subscription/status?contractorId=${cId}`);
      const data = await response.json();
      
      setSubscription({
        status: data.status || 'none',
        hasAccess: data.hasAccess || false,
        isTrialing: data.isTrialing || false,
        daysRemaining: data.daysRemaining || 0,
        periodEnd: data.periodEnd,
        trialEnd: data.trialEnd,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setSubscription(prev => ({ ...prev, loading: false }));
    }
  }

  // Start subscription checkout
  async function handleSubscribe() {
    if (!contractorId) return;
    
    setSubscribing(true);
    try {
      const response = await fetch("/api/stripe/subscription/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId }),
      });

      const data = await response.json();

      if (data.error) {
        alert("Error: " + data.error);
        setSubscribing(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Failed to start subscription. Please try again.");
      setSubscribing(false);
    }
  }

  // Open Stripe billing portal
  async function handleManageSubscription() {
    if (!contractorId) return;
    
    setOpeningPortal(true);
    try {
      const response = await fetch("/api/stripe/subscription/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId }),
      });

      const data = await response.json();

      if (data.error) {
        alert("Error: " + data.error);
        setOpeningPortal(false);
        return;
      }

      // Redirect to Stripe Portal
      window.location.href = data.portalUrl;
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to open billing portal. Please try again.");
      setOpeningPortal(false);
    }
  }

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

      // Account deleted - sign out and redirect to home
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
      password: newPassword
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

  // Helper to get status badge color and text
  function getStatusBadge(status) {
    switch (status) {
      case 'active':
        return { color: 'bg-green-100 text-green-700', text: 'Active' };
      case 'trialing':
        return { color: 'bg-blue-100 text-blue-700', text: 'Free Trial' };
      case 'past_due':
        return { color: 'bg-yellow-100 text-yellow-700', text: 'Past Due' };
      case 'canceled':
        return { color: 'bg-gray-100 text-gray-700', text: 'Canceled' };
      case 'canceling':
        return { color: 'bg-orange-100 text-orange-700', text: 'Canceling' };
      case 'unpaid':
        return { color: 'bg-red-100 text-red-700', text: 'Unpaid' };
      default:
        return { color: 'bg-gray-100 text-gray-600', text: 'No Subscription' };
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const statusBadge = getStatusBadge(subscription.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      
      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-gray-600">
            {isAdmin 
              ? "Manage your account settings and subscription" 
              : "Manage your account settings"
            }
          </p>
        </div>

        {/* Subscription Section - Admin Only */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Subscription
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Manage your Barix Billing subscription.
            </p>

            {subscription.loading ? (
              <p className="text-gray-500">Loading subscription status...</p>
            ) : subscription.hasAccess ? (
              // Has active subscription or trial
              <>
                <div className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        Barix Pro - $20/month
                      </p>
                      <p className="text-sm text-gray-500">
                        {subscription.isTrialing && subscription.daysRemaining > 0
                          ? `${subscription.daysRemaining} days left in your free trial`
                          : subscription.isTrialing 
                            ? "Your free trial is active"
                            : "Your subscription is active"
                        }
                      </p>
                    </div>
                    <span className={`px-3 py-1 ${statusBadge.color} text-sm font-medium rounded-full`}>
                      {statusBadge.text}
                    </span>
                  </div>
                </div>


                {/* Past due warning */}
                {subscription.status === 'past_due' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      Your payment is past due. Please update your payment method to avoid service interruption.
                    </p>
                  </div>
                )}

                {/* Action button */}
                <button
                  onClick={handleManageSubscription}
                  disabled={openingPortal}
                  className="px-5 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {openingPortal ? "Opening..." : "Manage Billing"}
                </button>
              </>
            ) : subscription.status === 'canceled' ? (
              // Canceled subscription
              <>
                <div className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">No Active Subscription</p>
                      <p className="text-sm text-gray-500">
                        Your subscription has been canceled.
                      </p>
                    </div>
                    <span className={`px-3 py-1 ${statusBadge.color} text-sm font-medium rounded-full`}>
                      {statusBadge.text}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="px-5 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {subscribing ? "Redirecting..." : "Resubscribe - $20/month"}
                </button>
              </>
            ) : (
              // No subscription yet
              <>
                <div className="border border-gray-200 rounded-lg p-5 mb-6">
                  <h3 className="font-semibold text-gray-900 text-lg">Barix Pro</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    $20<span className="text-base font-normal text-gray-500">/month</span>
                  </p>
                  <p className="text-sm text-green-600 mt-1 font-medium">
                    Includes 7-day free trial
                  </p>
                  
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Unlimited invoices and estimates
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Unlimited clients
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Accept online payments
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Team members included
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Direct bank payouts
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="w-full px-5 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 text-lg"
                >
                  {subscribing ? "Redirecting to checkout..." : "Start 7-Day Free Trial"}
                </button>
                <p className="text-center text-sm text-gray-500 mt-2">
                  No credit card required to start
                </p>
              </>
            )}
          </div>
        )}

        {/* Password Change Section - Available to all users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Change Password
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Update your password to keep your account secure.
          </p>

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                required
              />
            </div>

            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}

            {passwordSuccess && (
              <p className="text-sm text-green-600">{passwordSuccess}</p>
            )}

            <button
              type="submit"
              disabled={changingPassword}
              className="px-5 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Danger Zone - Admin Only */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-1">
              Danger Zone
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Irreversible actions that affect your account.
            </p>

            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Delete Account</p>
                  <p className="text-sm text-gray-500">
                    Permanently delete your account and all data.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-medium text-red-800 mb-2">
                  Are you absolutely sure?
                </p>
                <p className="text-sm text-red-700 mb-4">
                  This will permanently delete your account, cancel your subscription, 
                  and remove all your data including invoices, clients, and services. 
                  This action cannot be undone.
                </p>
                
                <label className="block text-sm font-medium text-red-800 mb-2">
                  Type <span className="font-mono bg-red-100 px-1">DELETE MY ACCOUNT</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmPhrase}
                  onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={deleting}
                />

                {deleteError && (
                  <p className="text-sm text-red-600 mb-4">{deleteError}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmPhrase !== "DELETE MY ACCOUNT"}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info for non-admins about restricted settings */}
        {!isAdmin && (
          <div className="bg-gray-100 rounded-xl p-6">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Looking for subscription or account settings?</span>
              {" "}Contact your team administrator to manage billing and company-wide settings.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
