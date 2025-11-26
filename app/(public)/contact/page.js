"use client";

import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/marketing/Footer";
import ContactForm from "@/components/contact/ContactForm";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar onOpenContact={() => {}} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-[1fr_380px]">
          <section>
            <h1 className="text-3xl font-bold">Contact sales</h1>
            <p className="mt-2 max-w-2xl text-gray-600">
              We’ll help you decide if Barix is the right fit and get you set up with a tailored demo for your trade.
            </p>
            <div className="mt-8 space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold">What to expect</h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
                  <li>10–15 minute discovery call</li>
                  <li>Walkthrough using your real scenarios</li>
                  <li>Clear next steps & pricing</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold">Prefer email?</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Reach us at{" "}
                  <a className="underline" href="mailto:hello@barixbilling.com">
                    hello@barixbilling.com
                  </a>
                </p>
              </div>
            </div>
          </section>
          <aside>
            <ContactForm />
          </aside>
        </div>
      </main>
      <Footer onOpenContact={() => {}} />
    </div>
  );
}
