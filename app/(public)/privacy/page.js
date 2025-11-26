"use client";

import React from "react";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/marketing/Footer";
import ContactModal from "@/components/contact/ContactModal";

export default function PrivacyPage() {
  const [contactOpen, setContactOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar onOpenContact={() => setContactOpen(true)} />

      <main className="mx-auto max-w-3xl px-4 py-12">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-3 text-gray-600">
            This Privacy Policy describes how <strong>Barix Billing LLC</strong> (“Barix,” “we,” “us,” or “our”) collects,
            uses, shares, and protects information in connection with our services.
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

        {/* Summary bullets */}
        <section className="mt-8 space-y-8 text-gray-800">
          <div>
            <h2 className="text-lg font-semibold">What we collect</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Account details (name, email, business info)</li>
              <li>Usage and technical data (device, IP, logs)</li>
              <li>Transactional data (invoices, payment metadata)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">How we use it</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Operate, secure, and improve Barix services</li>
              <li>Process payments and provide customer support</li>
              <li>Meet compliance and legal obligations</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Sharing & distribution</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>With trusted service providers (hosting, analytics, payments)</li>
              <li>No sale of personal data</li>
              <li>As required by law or to protect rights and safety</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Retention & deletion</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Retained while your account is active or as required by law</li>
              <li>Request deletion any time: <a className="text-brand underline" href="mailto:privacy@barixbilling.com">privacy@barixbilling.com</a></li>
              <li>We delete or anonymize unless retention is legally required</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Your rights</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Access, correction, deletion, portability (where applicable)</li>
              <li>Object to or restrict processing (where applicable)</li>
              <li>Manage cookies via browser settings</li>
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
