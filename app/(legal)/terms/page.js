"use client";

import React from "react";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/marketing/Footer";
import ContactModal from "@/components/contact/ContactModal";

export default function TermsPage() {
  const [contactOpen, setContactOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar onOpenContact={() => setContactOpen(true)} />

      <main className="mx-auto max-w-3xl px-4 py-12">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-3 text-gray-600">
            These Terms govern your access to and use of <strong>Barix Billing LLC</strong> products and services.
            By using the services, you agree to these Terms.
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
            <h2 className="text-lg font-semibold">Accounts & responsibilities</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Provide accurate information and safeguard credentials</li>
              <li>You are responsible for all activity under your account</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Acceptable use</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>No unlawful, fraudulent, infringing, or abusive activities</li>
              <li>Comply with applicable laws and card-network rules</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Intellectual property</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Software, branding, and designs are owned by Barix Billing LLC or licensors</li>
              <li>No rights granted except as expressly stated</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Disclaimers & liability</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Services provided "as is"; warranties disclaimed to the extent permitted by law</li>
              <li>Barix Billing LLC is not liable for indirect, incidental, or consequential damages</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Governing law</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Michigan, USA law governs; venue in Michigan courts</li>
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

