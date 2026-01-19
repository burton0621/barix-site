"use client";

import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/marketing/Footer";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Free Demo</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Try Barix Billing with full access to all features. No credit card required.
          </p>
        </section>

        {/* Free Demo Card */}
        <section className="mt-10 max-w-lg mx-auto">
          <div className="rounded-2xl border-2 border-brand bg-white p-8 shadow-lg">
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full mb-4">
                Currently Active
              </span>
              <h3 className="text-2xl font-bold text-gray-900">Free Demo Access</h3>
              <div className="mt-4">
                <span className="text-5xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500"> / month</span>
              </div>
              <p className="mt-2 text-gray-600">All features included during demo period</p>
            </div>
            
            <ul className="mt-8 space-y-3 text-gray-700">
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Unlimited invoices and estimates</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Unlimited clients</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Accept online card and ACH payments</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Team members included</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Direct bank payouts via Stripe Connect</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Email support</span>
              </li>
            </ul>

            <a
              href="/register"
              className="mt-8 block w-full text-center bg-brand text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity"
            >
              Get Started Free
            </a>
          </div>
        </section>

        {/* Processing Fees */}
        <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Payment Processing Fees</h2>
          <p className="mt-2 text-gray-600">
            When you accept payments through Barix, only standard Stripe processing fees apply:
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">Card Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">2.9% + $0.30</p>
              <p className="text-sm text-gray-500">Per successful transaction</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">ACH Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">0.8%</p>
              <p className="text-sm text-gray-500">$5 cap per transaction</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Barix does not charge any additional platform fees during the demo period.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium">How long is the demo period?</p>
              <p className="mt-1 text-gray-600">The demo is available indefinitely while we are in beta. We will notify you before any changes.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium">Are there any hidden fees?</p>
              <p className="mt-1 text-gray-600">No hidden fees. Only standard Stripe processing fees apply when you accept payments.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium">Can I accept real payments?</p>
              <p className="mt-1 text-gray-600">Yes! Connect your Stripe account and start accepting payments immediately.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium">What happens when demo ends?</p>
              <p className="mt-1 text-gray-600">We will announce pricing before the demo ends and give you plenty of notice to decide.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

