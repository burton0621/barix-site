"use client";

import React from "react";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/marketing/Footer";
import ContactModal from "@/components/contact/ContactModal";

export default function CookiePolicyPage() {
  const [contactOpen, setContactOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar onOpenContact={() => setContactOpen(true)} />

      <main className="mx-auto max-w-3xl px-4 py-12">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="mt-3 text-gray-600">
            How <strong>Barix Billing LLC</strong> uses cookies and similar technologies on our websites and services.
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
            <h2 className="text-lg font-semibold">What cookies are</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Small text files stored on your device by your browser</li>
              <li>Used for session management, preferences, analytics, and security</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">How we use cookies</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Essential cookies for core functionality and secure login</li>
              <li>Analytics cookies to measure performance and improve UX</li>
              <li>Preference cookies to remember settings</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Your choices</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700">
              <li>Manage cookies in your browser settings</li>
              <li>Blocking some cookies may limit certain features</li>
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

