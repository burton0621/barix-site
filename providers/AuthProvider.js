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
  - onboardingComplete: True if profile and subscription are set up
  - subscriptionStatus: Current subscription status (trialing, active, etc.)
  
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
  
  // Onboarding state - track if user has completed required setup
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);

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
          setSubscriptionStatus(null);
          setProfileComplete(false);
          setIsLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  /*
    Load all user data after authentication
    This includes their company profile, team membership, and subscription status
  */
  async function loadUserData(userId) {
    setIsLoading(true);

    // First, get the user's team membership to find their contractor_id and role
    const { data: membershipData } = await supabase
      .from("team_members")
      .select("contractor_id, role, name, email")
      .eq("user_id", userId)
      .single();

    let contractorId = userId;

    if (membershipData) {
      setMembership(membershipData);
      contractorId = membershipData.contractor_id;
    }

    // Load the company profile including subscription status and selected plan
    const { data: profileData } = await supabase
      .from("contractor_profiles")
      .select("company_name, logo_url, subscription_status, contracting_trade, selected_plan")
      .eq("id", contractorId)
      .single();

    if (profileData) {
      setProfile(profileData);
      setSubscriptionStatus(profileData.subscription_status);
      
      // Profile is complete if they have at least a company name set
      setProfileComplete(!!profileData.company_name);
    } else {
      setProfile(null);
      setSubscriptionStatus(null);
      setProfileComplete(false);
    }

    // If no membership data, set default for owner
    if (!membershipData && profileData) {
      setMembership({
        contractor_id: userId,
        role: "admin",
        name: null,
        email: null
      });
    }

    setIsLoading(false);
  }

  // Quick helper to check if current user is an admin
  const isAdmin = membership?.role === "admin";
  
  // Check if user has completed onboarding
  // FREE DEMO MODE: No subscription required - everyone has access
  // Only Stripe processing fees apply, Barix is not charging platform fees yet
  const hasActiveSubscription = true;
  const onboardingComplete = profileComplete;

  // Function to refresh subscription status (call after subscribing)
  async function refreshSubscriptionStatus() {
    if (!membership?.contractor_id) return;
    
    const { data } = await supabase
      .from("contractor_profiles")
      .select("subscription_status")
      .eq("id", membership.contractor_id)
      .single();
    
    if (data) {
      setSubscriptionStatus(data.subscription_status);
    }
  }

  return (
    <AuthContext.Provider value={{ 
      session, 
      profile, 
      membership,
      isAdmin,
      isLoading,
      subscriptionStatus,
      hasActiveSubscription,
      profileComplete,
      onboardingComplete,
      refreshSubscriptionStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/*
  useAuth Hook
  ------------
  Use this in any component to access auth state:
  
  const { session, profile, membership, isAdmin, isLoading, onboardingComplete } = useAuth();
  
  Examples:
  - Check if logged in: if (session) { ... }
  - Get company name: profile?.company_name
  - Check admin status: if (isAdmin) { ... }
  - Get user's role: membership?.role
  - Check onboarding: if (!onboardingComplete) { redirect to setup }
*/
export function useAuth() {
  return useContext(AuthContext);
}
