"use client";

/*
  Welcome Page
  ------------
  This page is shown to newly invited team members after their first login.
  It provides a warm welcome and helps them get started with the platform.
  
  The page displays:
  - A personalized welcome message with their name
  - The company they've joined
  - Their role in the team
  - A button to continue to the dashboard
  
  After visiting this page, a flag is set in localStorage so they
  won't see it again on future logins.
*/

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";

export default function WelcomePage() {
  const router = useRouter();
  const { session, profile, membership, isLoading } = useAuth();
  const [showConfetti, setShowConfetti] = useState(true);

  /*
    Check authentication and mark welcome as seen
    If user is not logged in, redirect to login page
  */
  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/login");
      return;
    }

    // Mark that this user has seen the welcome page
    if (session?.user?.id) {
      localStorage.setItem(`welcome_seen_${session.user.id}`, "true");
    }

    // Stop confetti animation after a few seconds
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, [isLoading, session, router]);

  // Show loading state while auth is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Get the user's display name from membership or fallback
  const userName = membership?.name || session?.user?.email?.split("@")[0] || "Team Member";
  const companyName = profile?.company_name || "the team";
  const userRole = membership?.role === "admin" ? "Administrator" : "Team Member";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 overflow-hidden relative">
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Confetti-like floating elements */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"][i % 5],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                opacity: 0.6
              }}
            />
          ))}
        </div>
      )}

      {/* Main welcome card */}
      <div className="relative z-10 max-w-lg w-full">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-10 text-center shadow-2xl">
          
          {/* Welcome icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>

          {/* Welcome message */}
          <h1 className="text-4xl font-bold text-white mb-3">
            Welcome to the team!
          </h1>
          
          <h2 className="text-2xl font-semibold text-blue-300 mb-6">
            {userName}
          </h2>

          {/* Company and role info */}
          <div className="bg-white/5 rounded-xl p-5 mb-8 border border-white/10">
            <p className="text-slate-300 text-lg mb-2">
              You've joined <span className="text-white font-semibold">{companyName}</span>
            </p>
            <p className="text-slate-400">
              Your role: <span className="text-blue-300 font-medium">{userRole}</span>
            </p>
          </div>

          {/* What you can do section */}
          <div className="text-left mb-8">
            <p className="text-slate-400 text-sm mb-3">As a team member, you can:</p>
            <ul className="space-y-2">
              <li className="flex items-center text-slate-300">
                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Create and manage invoices
              </li>
              <li className="flex items-center text-slate-300">
                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                View and add clients
              </li>
              <li className="flex items-center text-slate-300">
                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Track payments and revenue
              </li>
            </ul>
          </div>

          {/* Continue button */}
          <Link
            href="/dashboard"
            className="block w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:scale-[1.02] shadow-lg"
          >
            Continue to Dashboard
          </Link>

          {/* Tip */}
          <p className="text-slate-500 text-sm mt-6">
            Tip: Change your password in Settings for security
          </p>
        </div>
      </div>
    </div>
  );
}

