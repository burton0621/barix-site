"use client";

import React from "react";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/marketing/Footer";
import ContactModal from "@/components/contact/ContactModal";

export default function DataPolicyPage() {
  const [contactOpen, setContactOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar onOpenContact={() => setContactOpen(true)} />

      <main className="mx-auto max-w-3xl px-4 py-12">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Data Policy</h1>
          <p className="mt-3 text-gray-600">
            How <strong>Barix Billing LLC</strong> collects, distributes, retains, and protects data used to deliver the service.
          </p>

        {/* Download PDF */}
          <div className="mt-5">
            <a
              href="/legal/barix-legal.pdf"
              download
              className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Download Full Legal PDF
            </a>
          </div>
        </header>

        <section className="mt-8 space-y-8 text-gray-800">
          <div>
            <h2 className="text-lg font-semibold">Collection & distribution</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Collects account, usage, and transactional data needed to operate the platform</li>
              <li>Shares data with trusted providers (payments, hosting, analytics, integrations) for service delivery</li>
              <li>No sale of personal data</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Retention & deletion</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Retained while the account is active or as required by finance and tax rules</li>
              <li>Deletion on request (unless retention is legally required): <a className="text-brand underline" href="mailto:privacy@barixbilling.com">privacy@barixbilling.com</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Security & sub-processors</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Reasonable administrative, technical, and physical safeguards</li>
              <li>Vetted sub-processors; current list available on request</li>
            </ul>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Effective date: {new Date().toLocaleDateString()}
          </p>
        </section>
      </main>

      <Footer onOpenContact={() => setContactOpen(true)} />
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
