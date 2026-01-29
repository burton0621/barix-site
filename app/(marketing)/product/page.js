"use client";

import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/marketing/Footer";
import DemoFrame from "@/components/marketing/DemoFrame";
import ClientPanel from "@/components/marketing/ClientPanel";

function Feature({ title, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-gray-600">{children}</p>
    </div>
  );
}

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            The billing cockpit for trades and services
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Issue invoices, take card and ACH, reconcile payouts, and keep customers in the loop. Simple and fast.
          </p>
        </section>

        {/* Key features */}
        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <Feature title="Invoices that get paid">
            Create in seconds, auto reminders, one-click pay links, partial and full refunds.
          </Feature>
          <Feature title="Payments that just work">
            Card and ACH support, Apple Pay, Google Pay, surcharge tooling where allowed.
          </Feature>
          <Feature title="Payouts you can trust">
            Clear schedules, fees visible, export-friendly reconciliation.
          </Feature>
          <Feature title="Client portal">
            Customers view invoices, pay securely, download receipts, update cards on file.
          </Feature>
          <Feature title="Mobile first">
            Techs capture jobs in the field. Office tracks cash flow in real time.
          </Feature>
          <Feature title="Integrations">
            Export you invoices directly to QuickBooks.
          </Feature>
        </section>

        {/* Demo in frame */}
        <section className="mt-12">
          <DemoFrame
            title="demo.barixbilling.com"
            ratio="16/10"
            caption="Sample client dashboard. Mock data."
          >
            <ClientPanel />
          </DemoFrame>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Product FAQ</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium">How fast can I go live</p>
              <p className="mt-1 text-gray-600">Same day for sandbox. First live invoice once your business is verified.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium">Do you support deposits and progress billing</p>
              <p className="mt-1 text-gray-600">Yes. Split invoices and scheduled reminders are supported.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

