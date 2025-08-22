"use client";

import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";

function Tier({ name, price, blurb, features = [], cta = "Start free", highlight = false }) {
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
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Pricing that scales with you</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Transparent monthly plans. Processing fees separate. Volume discounts available.
          </p>
        </section>

        {/* Tiers */}
        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <Tier
            name="Starter"
            price={29}
            blurb="For solo operators and new crews"
            features={[
              "100 invoices per month",
              "Card and ACH",
              "Basic reminders",
              "Email support",
            ]}
          />
          <Tier
            name="Growth"
            price={79}
            blurb="For busy shops that want automation"
            features={[
              "Unlimited invoices",
              "Advanced reminders",
              "Client portal",
              "Priority support",
            ]}
            highlight
            cta="Start trial"
          />
          <Tier
            name="Pro"
            price={179}
            blurb="For teams with reporting needs"
            features={[
              "Team permissions",
              "Export and reconciliation",
              "Custom fields",
              "Phone support",
            ]}
          />
        </section>

        {/* Fees callout */}
        <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Payment processing</h2>
          <p className="mt-2 text-gray-600">
            We offer internal payment processing so all you have to do is get paid.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Ask for our merchant rate sheet and pilot pricing.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Pricing FAQ</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium">Is there a long term contract?</p>
              <p className="mt-1 text-gray-600">No. Month to month with the option to lock annual for a discount.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium">What happens if I exceed plan limits?</p>
              <p className="mt-1 text-gray-600">We will notify you and you can upgrade at any time. No surprise overage fees.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
