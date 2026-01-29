"use client";

/*
  Team Management Page
  --------------------
  Admin-only page for managing team members within a company.
  
  Features:
  - View all team members and their roles
  - Invite new users via email
  - Change user roles (admin/user)
  - Remove users from the team
  
  Only users with 'admin' role can access this page.
  Regular users who try to access it will see an access denied message.
*/

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";
import Toast from "@/components/common/Toast/Toast";
import ConfirmDialog from "@/components/common/ConfirmDialog/ConfirmDialog";

export default function TeamPage() {
  const router = useRouter();
  const { session, profile, membership, isAdmin, isLoading } = useAuth();
  
  // Team members list
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  
  // Toast notification state for user-friendly feedback
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });
  
  // Remove member confirmation dialog state
  const [removeConfirm, setRemoveConfirm] = useState({
    open: false,
    member: null,
  });
  
  // Helper to show toast notifications
  const showToast = (message, type = "error") => {
    setToast({ open: true, message, type });
  };

  /*
    Load team members when the page mounts
    Only loads if user is authenticated and has membership
  */
  useEffect(() => {
    if (!isLoading && membership?.contractor_id) {
      loadTeamMembers();
    }
  }, [isLoading, membership]);

  /*
    Redirect non-authenticated users to login
  */
  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/login");
    }
  }, [isLoading, session, router]);

  /*
    Fetch all team members for this company
  */
  async function loadTeamMembers() {
    setLoadingTeam(true);
    
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("contractor_id", membership.contractor_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading team:", error);
    } else {
      setTeamMembers(data || []);
    }
    
    setLoadingTeam(false);
  }

  /*
    Invite a new team member
    Calls the API route which:
    1. Creates a Supabase Auth user with the admin-set password
    2. Creates a team_members record linked to the company
    3. Sends an invitation email via Resend
  */
  async function handleInvite(e) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviting(true);

    // Validate password is provided and meets minimum length
    if (!invitePassword || invitePassword.length < 6) {
      setInviteError("Please set a temporary password (at least 6 characters)");
      setInviting(false);
      return;
    }

    // Check if email is already on the team (client-side quick check)
    const existingMember = teamMembers.find(
      m => m.email.toLowerCase() === inviteEmail.toLowerCase()
    );
    
    if (existingMember) {
      setInviteError("This email is already on your team.");
      setInviting(false);
      return;
    }

    // Get current user's ID for the invited_by field
    const { data: { user } } = await supabase.auth.getUser();

    try {
      // Call the invitation API route
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail.toLowerCase(),
          name: inviteName || null,
          password: invitePassword,
          role: inviteRole,
          contractorId: membership.contractor_id,
          invitedBy: user.id,
          companyName: profile?.company_name || "Your team"
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setInviteError(result.error || "Failed to send invitation");
        setInviting(false);
        return;
      }

      // Success - clear form and reload team list
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      setInviteRole("user");
      
      if (result.emailSent) {
        setInviteSuccess(`Invitation sent to ${inviteEmail}. They can log in with the password you set.`);
      } else {
        setInviteSuccess(`Account created for ${inviteEmail}. Share the password with them to log in.`);
      }
      
      setInviting(false);
      loadTeamMembers();

    } catch (error) {
      console.error("Invitation error:", error);
      setInviteError("Failed to send invitation. Please try again.");
      setInviting(false);
    }
  }

  /*
    Change a team member's role
  */
  async function handleRoleChange(memberId, newRole) {
    const { error } = await supabase
      .from("team_members")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", memberId);

    if (error) {
      showToast("Failed to update role: " + error.message);
      return;
    }

    showToast("Role updated successfully", "success");
    loadTeamMembers();
  }

  /*
    Remove a team member
    Admins cannot remove themselves (to prevent orphaned companies)
  */
  // Shows the remove confirmation dialog
  async function handleRemoveClick(member) {
    // Prevent removing yourself
    const { data: { user } } = await supabase.auth.getUser();
    if (member.user_id === user.id) {
      showToast("You cannot remove yourself from the team.", "warning");
      return;
    }

    setRemoveConfirm({
      open: true,
      member,
    });
  }

  // Actually removes the member after confirmation
  async function handleConfirmRemove() {
    const { member } = removeConfirm;
    setRemoveConfirm({ ...removeConfirm, open: false });

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", member.id);

    if (error) {
      showToast("Failed to remove member: " + error.message);
      return;
    }

    showToast(`${member.name || member.email} removed from team`, "success");
    loadTeamMembers();
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Show access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        <main className="max-w-3xl mx-auto px-6 py-10">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m5-6a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">
              Only administrators can manage team members. Contact your admin if you need access.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      {/* Toast notification for user-friendly feedback */}
      <Toast 
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />
      
      {/* Remove member confirmation dialog */}
      <ConfirmDialog
        open={removeConfirm.open}
        title="Remove Team Member?"
        message={`Are you sure you want to remove ${removeConfirm.member?.name || removeConfirm.member?.email || 'this member'} from the team?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        confirmType="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveConfirm({ ...removeConfirm, open: false })}
      />
      
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar />
        
        <main className="max-w-4xl mx-auto px-6 py-10">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Team</h1>
            <p className="mt-1 text-gray-600">
              Manage who has access to your Barix account
            </p>
          </div>

        {/* Invite Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Invite Team Member
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Send an invitation to add someone to your team.
          </p>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temporary Password *
              </label>
              <input
                type="text"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Set a password for this user"
                className="w-full md:w-1/2 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">
                Share this password with the team member. They can change it later in Settings.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full md:w-48 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Admins can manage team members and billing. Users can only create invoices and manage clients.
              </p>
            </div>

            {inviteError && (
              <p className="text-sm text-red-600">{inviteError}</p>
            )}

            {inviteSuccess && (
              <p className="text-sm text-green-600">{inviteSuccess}</p>
            )}

            <button
              type="submit"
              disabled={inviting}
              className="px-5 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviting ? "Sending..." : "Send Invitation"}
            </button>
          </form>
        </div>

        {/* Team Members List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Team Members ({teamMembers.length})
            </h2>
          </div>

          {loadingTeam ? (
            <div className="p-6 text-center text-gray-500">
              Loading team members...
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No team members yet. Invite someone above.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {teamMembers.map((member) => (
                <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar with initial */}
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">
                      {(member.name || member.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.name || member.email}
                        {!member.user_id && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                            Pending
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role Dropdown */}
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveClick(member)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove from team"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Role Explanation */}
        <div className="mt-6 bg-gray-100 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Role Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-900 mb-1">Admin</p>
              <ul className="text-gray-600 space-y-1">
                <li>- Manage team members</li>
                <li>- Manage billing and subscription</li>
                <li>- Edit company profile</li>
                <li>- All user permissions</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">User</p>
              <ul className="text-gray-600 space-y-1">
                <li>- Create and send invoices</li>
                <li>- Manage clients</li>
                <li>- View dashboard</li>
                <li>- View reports</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
    </>
  );
}

