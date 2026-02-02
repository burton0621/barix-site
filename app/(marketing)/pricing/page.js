"use client";

import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/marketing/Footer";

function Tier({ name, price, blurb, features = [], cta = "Join Free Demo", highlight = false }) {
  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${highlight ? "border-brand bg-white" : "border-gray-200 bg-white"}`}>
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="mt-2 text-gray-600">{blurb}</p>
      <div className="mt-4">
        <span className="text-4xl font-bold">${price}</span>
        <span className="text-gray-500"> per month</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-gray-700">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href="/contact"
        className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold ${
          highlight ? "bg-brand text-white hover:opacity-90" : "border border-gray-300 text-gray-900 hover:bg-gray-50"
        }`}
      >
        {cta}
      </a>
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Free Demo</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Transparent monthly plans. Processing fees separate.
          </p>
        </section>

        {/* Tiers */}
        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <Tier
            name="Starter"
            price={
              <span className="line-through">9.99</span>
            }
            blurb="For solo operators and new crews"
            features={[
              "Unlimited Invoices",
              "Card and ACH",
              "Basic reminders",
              "Email support",
            ]}
          />
          <Tier
            name="Growth"
            price={49.99}
            blurb="For busy shops that want automation"
            features={[
              "Everything in Starter",
              "Advanced Reminders",
              "Client Portal",
              "Priority Support",
            ]}
            highlight
            cta="Coming Soon"
          />
          <Tier
            name="Pro"
            price={129.99}
            blurb="For teams with reporting needs"
            features={[
              "Team permissions",
              "Export and reconciliation",
              "Custom fields",
              "Phone support",
            ]}
            highlight
            cta="Coming Soon"
          />
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
              <p className="font-medium">What are the processing fees?</p>
              <p className="mt-1 text-gray-600">Processing fees are set by payments facilitator Stripe Connect. Industry standard rates ranging from 3-4%.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

