"use client";

/*
  Onboarding Gate Component
  -------------------------
  Wraps page content and shows a setup prompt if the user hasn't completed
  their profile or subscription. Used on pages like Invoices, Clients, etc.
  where we want to ensure users are fully set up before using features.
  
  Requirements to pass the gate:
  1. Profile complete (company name is set)
  2. Active subscription (trialing or active)
  
  If requirements aren't met, shows a friendly prompt with links to complete setup.
*/

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OnboardingGate({ children }) {
  const router = useRouter();
  const { 
    isLoading, 
    profileComplete, 
    hasActiveSubscription, 
    onboardingComplete,
    isAdmin 
  } = useAuth();

  // Still loading auth state - show nothing or a loader
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // If onboarding is complete, render the page content
  if (onboardingComplete) {
    return children;
  }

  // Otherwise, show the setup prompt
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Complete Your Setup
        </h2>
        <p className="text-gray-600 mb-8">
          Before you can create invoices, please complete the following steps:
        </p>

        <div className="space-y-4 text-left mb-8">
          {/* Step 1: Complete Profile */}
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${
            profileComplete 
              ? 'bg-green-50 border-green-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              profileComplete 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-300 text-white'
            }`}>
              {profileComplete ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="text-sm font-medium">1</span>
              )}
            </div>
            <div className="flex-1">
              <p className={`font-medium ${profileComplete ? 'text-green-800' : 'text-gray-900'}`}>
                Complete Your Profile
              </p>
              <p className={`text-sm ${profileComplete ? 'text-green-600' : 'text-gray-500'}`}>
                {profileComplete 
                  ? 'Your company profile is set up' 
                  : 'Add your company name and business details'
                }
              </p>
              {!profileComplete && (
                <Link 
                  href="/profile" 
                  className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Go to Profile →
                </Link>
              )}
            </div>
          </div>

          {/* Step 2: Subscribe */}
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${
            hasActiveSubscription 
              ? 'bg-green-50 border-green-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              hasActiveSubscription 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-300 text-white'
            }`}>
              {hasActiveSubscription ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="text-sm font-medium">2</span>
              )}
            </div>
            <div className="flex-1">
              <p className={`font-medium ${hasActiveSubscription ? 'text-green-800' : 'text-gray-900'}`}>
                Start Your Subscription
              </p>
              <p className={`text-sm ${hasActiveSubscription ? 'text-green-600' : 'text-gray-500'}`}>
                {hasActiveSubscription 
                  ? 'Your subscription is active' 
                  : 'Start your 7-day free trial to unlock all features'
                }
              </p>
              {!hasActiveSubscription && isAdmin && (
                <Link 
                  href="/settings" 
                  className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Go to Settings →
                </Link>
              )}
              {!hasActiveSubscription && !isAdmin && (
                <p className="mt-2 text-sm text-gray-500 italic">
                  Contact your administrator to set up billing
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Need help? Contact us at support@barixbilling.com
        </p>
      </div>
    </div>
  );
}

