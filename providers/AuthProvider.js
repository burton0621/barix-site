"use client";

/*
  Auth Provider
  -------------
  Central authentication context for the entire app.
  
  Provides:
  - session: The current Supabase auth session (null if logged out)
  - profile: The contractor's company profile (company_name, logo_url)
  - membership: The user's team membership info (role, contractor_id)
  - isAdmin: Quick boolean check for admin role
  - isLoading: True while initial auth check is happening
  
  The membership object tells us:
  - Which company the user belongs to (contractor_id)
  - What role they have (admin or user)
  - This is used throughout the app for permission checks
*/

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [membership, setMembership] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial session check when app loads
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        loadUserData(data.session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);

        if (newSession?.user?.id) {
          loadUserData(newSession.user.id);
        } else {
          // User logged out - clear everything
          setProfile(null);
          setMembership(null);
          setIsLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  /*
    Load all user data after authentication
    This includes their company profile and team membership
  */
  async function loadUserData(userId) {
    setIsLoading(true);

    // First, get the user's team membership to find their contractor_id and role
    const { data: membershipData } = await supabase
      .from("team_members")
      .select("contractor_id, role, name, email")
      .eq("user_id", userId)
      .single();

    if (membershipData) {
      setMembership(membershipData);

      // Now load the company profile using the contractor_id from membership
      const { data: profileData } = await supabase
        .from("contractor_profiles")
        .select("company_name, logo_url")
        .eq("id", membershipData.contractor_id)
        .single();

      setProfile(profileData || null);
    } else {
      // Fallback for users who don't have a team_members entry yet
      // This handles existing users before the team system was added
      const { data: profileData } = await supabase
        .from("contractor_profiles")
        .select("company_name, logo_url")
        .eq("id", userId)
        .single();

      setProfile(profileData || null);
      
      // Set a default membership for the owner (they're the admin)
      if (profileData) {
        setMembership({
          contractor_id: userId,
          role: "admin",
          name: null,
          email: null
        });
      }
    }

    setIsLoading(false);
  }

  // Quick helper to check if current user is an admin
  const isAdmin = membership?.role === "admin";

  return (
    <AuthContext.Provider value={{ 
      session, 
      profile, 
      membership,
      isAdmin,
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/*
  useAuth Hook
  ------------
  Use this in any component to access auth state:
  
  const { session, profile, membership, isAdmin, isLoading } = useAuth();
  
  Examples:
  - Check if logged in: if (session) { ... }
  - Get company name: profile?.company_name
  - Check admin status: if (isAdmin) { ... }
  - Get user's role: membership?.role
*/
export function useAuth() {
  return useContext(AuthContext);
}
