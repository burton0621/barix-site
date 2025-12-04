"use client";

/*
  Settings Page
  -------------
  Account settings for logged-in users. This is separate from the
  Profile page which handles business information.
  
  Settings include:
  - Password change (available to all users)
  - Subscription management (admin only)
  - Account deletion (admin only)
  
  The password change uses Supabase's updateUser method.
  Subscription will eventually integrate with Stripe.
  
  Role-based visibility:
  - All users: Password change
  - Admins only: Subscription, Danger Zone
*/

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";

export default function SettingsPage() {
  const router = useRouter();
  const { session, isAdmin, isLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  /*
    Check if user is authenticated
    Redirect to login if not
  */
  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    }
  }, [isLoading, session, router]);

  /*
    Handle password change
    Supabase requires re-authentication for password changes in some cases,
    but updateUser should work if the user has a valid session.
  */
  async function handlePasswordChange(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    // Validate that new passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    // Validate minimum password length
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setChangingPassword(true);

    // Update the password through Supabase
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setPasswordError(error.message);
      setChangingPassword(false);
      return;
    }

    // Clear the form and show success message
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSuccess("Password updated successfully.");
    setChangingPassword(false);
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

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

        {/* Subscription Section - Admin Only */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Subscription
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              View and manage your billing plan.
            </p>

            {/* Current Plan Display */}
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Free Trial</p>
                  <p className="text-sm text-gray-500">
                    You're currently on the free trial.
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  Active
                </span>
              </div>
            </div>

            {/* Upgrade Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Starter Plan */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900">Starter</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  $29<span className="text-sm font-normal text-gray-500">/month</span>
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li>100 invoices/month</li>
                  <li>Card and ACH payments</li>
                  <li>Basic reminders</li>
                  <li>Email support</li>
                </ul>
              </div>

              {/* Growth Plan - Most Popular */}
              <div className="border-2 border-brand rounded-lg p-4 relative">
                <span className="absolute -top-2.5 left-4 px-2 bg-brand text-white text-xs font-medium rounded">
                  Popular
                </span>
                <h3 className="font-semibold text-gray-900">Growth</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  $79<span className="text-sm font-normal text-gray-500">/month</span>
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li>Unlimited invoices</li>
                  <li>Advanced reminders</li>
                  <li>Client portal</li>
                  <li>Priority support</li>
                </ul>
              </div>

              {/* Pro Plan - For Teams */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900">Pro</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  $179<span className="text-sm font-normal text-gray-500">/month</span>
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li>Team permissions</li>
                  <li>Export and reconciliation</li>
                  <li>Custom fields</li>
                  <li>Phone support</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => alert("Stripe integration coming soon!")}
              className="px-5 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors"
            >
              Upgrade Plan
            </button>
          </div>
        )}

        {/* Danger Zone - Admin Only */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-1">
              Danger Zone
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Irreversible actions that affect your account.
            </p>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Delete Account</p>
                <p className="text-sm text-gray-500">
                  Permanently delete your account and all data.
                </p>
              </div>
              <button
                onClick={() => alert("Account deletion coming soon. Contact support for now.")}
                className="px-4 py-2 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete Account
              </button>
            </div>
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
