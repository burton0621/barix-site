"use client";

/*
  Register Page
  -------------
  Two-step registration flow for new contractors:
  
  Step 1: Choose your subscription plan (fetched from Stripe product catalog)
  Step 2: Enter account details (email, password, company name)
  
  After successful signup:
  1. Creates a user in Supabase Auth
  2. Creates a contractor_profiles row with their selected plan
  3. Redirects to the profile page so they can complete their setup
  
  FREE DEMO MODE: All plans are free during the demo period.
  Users select their intended tier for when billing goes live.
  
  Plans are loaded dynamically from Stripe so pricing changes there
  are automatically reflected here.
*/

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import styles from "./register.module.css";

export default function RegisterPage() {
  // Plans fetched from Stripe product catalog
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");

  // Track which step we're on (1 = plan selection, 2 = account details)
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPlanData, setSelectedPlanData] = useState(null);

  /*
    Fetch available plans from Stripe product catalog on mount
  */
  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch("/api/stripe/products");
        const data = await response.json();

        if (data.error) {
          setPlansError(data.error);
          setPlansLoading(false);
          return;
        }

        setPlans(data.plans || []);
        setPlansLoading(false);
      } catch (err) {
        console.error("Failed to fetch plans:", err);
        setPlansError("Failed to load plans. Please refresh the page.");
        setPlansLoading(false);
      }
    }

    fetchPlans();
  }, []);

  // Account details
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /*
    Password requirements - each requirement has a label and a test function
    The test function returns true if the requirement is met
  */
  const passwordRequirements = [
    {
      id: "length",
      label: "At least 8 characters",
      test: (pwd) => pwd.length >= 8,
    },
    {
      id: "uppercase",
      label: "One uppercase letter",
      test: (pwd) => /[A-Z]/.test(pwd),
    },
    {
      id: "lowercase",
      label: "One lowercase letter",
      test: (pwd) => /[a-z]/.test(pwd),
    },
    {
      id: "number",
      label: "One number",
      test: (pwd) => /[0-9]/.test(pwd),
    },
    {
      id: "special",
      label: "One special character",
      test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    },
  ];

  // Check if all password requirements are met
  const allRequirementsMet = passwordRequirements.every((req) => req.test(password));
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  /*
    Handle plan selection - store both ID and full plan data
  */
  function handlePlanSelect(plan) {
    setSelectedPlan(plan.id);
    setSelectedPlanData(plan);
  }

  function proceedToStep2() {
    if (!selectedPlan) {
      setError("Please select a plan to continue.");
      return;
    }
    setError("");
    setStep(2);
  }

  /*
    Handle form submission
    Creates the user account and their initial profile with selected plan
  */
  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    // Check that all password requirements are met before submitting
    if (!allRequirementsMet) {
      setError("Please meet all password requirements.");
      return;
    }

    // Make sure passwords match before we hit the API
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    // Step 1: Create user in Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const user = signUpData.user;

    if (!user) {
      setError("User creation failed. Please try again.");
      setLoading(false);
      return;
    }

    // Step 2: Create the contractor profile with their selected plan
    // Store both the plan name (for display) and price ID (for future billing)
    const { error: profileError } = await supabase
      .from("contractor_profiles")
      .insert({
        id: user.id,
        company_name: companyName,
        selected_plan: selectedPlanData?.name?.toLowerCase() || selectedPlan,
        selected_price_id: selectedPlanData?.priceId || null,
      });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Step 3: Send them to profile to complete their setup
    window.location.href = "/profile";
  }

  // Step 1: Plan Selection
  if (step === 1) {
    // Show loading state while fetching plans from Stripe
    if (plansLoading) {
      return (
        <div className={styles.container}>
          <div className={styles.form}>
            <h1>Loading plans...</h1>
            <p className={styles.subtitle}>Fetching available subscription options</p>
          </div>
        </div>
      );
    }

    // Show error if we couldn't fetch plans
    if (plansError) {
      return (
        <div className={styles.container}>
          <div className={styles.form}>
            <h1>Unable to load plans</h1>
            <p className={styles.error}>{plansError}</p>
            <button onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    // Show message if no plans are configured in Stripe
    if (plans.length === 0) {
      return (
        <div className={styles.container}>
          <div className={styles.form}>
            <h1>No plans available</h1>
            <p className={styles.subtitle}>
              Please contact support or check back later.
            </p>
            <p className={styles.footerText}>
              Already have an account?{" "}
              <Link href="/login" className={styles.link}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <div className={styles.formWide}>
          <h1>Choose your plan</h1>
          <p className={styles.subtitle}>
            Select the plan that fits your business. You can change anytime.
          </p>

          {/* Free demo notice - let users know all plans are currently free */}
          <div className={styles.freeNotice}>
            <p>
              <strong>Free Demo:</strong> All plans are free during the demo period. 
              Only Stripe processing fees apply when accepting payments.
            </p>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.planGrid}>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`${
                  selectedPlan === plan.id
                    ? styles.planCardSelected
                    : styles.planCard
                } ${plan.popular ? styles.planCardHighlight : ""}`}
                onClick={() => handlePlanSelect(plan)}
              >
                <p className={styles.planName}>{plan.name}</p>
                <p className={styles.planPrice}>
                  ${plan.price}
                  <span className={styles.planPriceSuffix}>
                    {plan.interval === "month" ? "/month" : 
                     plan.interval === "year" ? "/year" : ""}
                  </span>
                </p>
                <p className={styles.planBlurb}>{plan.blurb}</p>
                <ul className={styles.planFeatures}>
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <button onClick={proceedToStep2} disabled={!selectedPlan}>
            Continue with {selectedPlanData?.name || "..."} Plan
          </button>

          <p className={styles.footerText}>
            Already have an account?{" "}
            <Link href="/login" className={styles.link}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Account Details
  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleRegister}>
        <h1>Create your account</h1>
        <p className={styles.subtitle}>
          {selectedPlanData?.name || "Selected"} Plan - Free during demo
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <input
          type="email"
          placeholder="Email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Password requirements with real-time validation */}
        {password.length > 0 && (
          <div className={styles.passwordRequirements}>
            <p className={styles.passwordRequirementsTitle}>Password Requirements</p>
            <ul className={styles.requirementsList}>
              {passwordRequirements.map((req) => {
                const isMet = req.test(password);
                return (
                  <li
                    key={req.id}
                    className={isMet ? styles.requirementItemMet : styles.requirementItem}
                  >
                    <span className={styles.requirementIcon}>
                      {isMet ? (
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      )}
                    </span>
                    {req.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <input
          type="password"
          placeholder="Confirm password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {/* Password match indicator - shows when both fields have content */}
        {confirmPassword.length > 0 && (
          <div
            className={`${styles.passwordMatchIndicator} ${
              passwordsMatch ? styles.passwordMatch : styles.passwordMismatch
            }`}
          >
            <span className={styles.requirementIcon}>
              {passwordsMatch ? (
                <svg fill="currentColor" viewBox="0 0 20 20" width="14" height="14">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg fill="currentColor" viewBox="0 0 20 20" width="14" height="14">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
            {passwordsMatch ? "Passwords match" : "Passwords do not match"}
          </div>
        )}

        <input
          type="text"
          placeholder="Business name"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />

        <button 
          type="submit" 
          disabled={loading || !allRequirementsMet || !passwordsMatch}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <button
          type="button"
          className={styles.backButton}
          onClick={() => setStep(1)}
          disabled={loading}
        >
          Back to plan selection
        </button>

        <p className={styles.footerText}>
          Already have an account?{" "}
          <Link href="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
