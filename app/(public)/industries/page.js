"use client";

import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/marketing/Footer";
import React from "react";
import ContactModal from "@/components/contact/ContactModal";


const groups = [
  {
    title: "Plumbing",
    bullets: [
      "Deposits and progress billing",
      "After-hours emergency calls",
      "Photo notes on invoices",
    ],
  },
  {
    title: "Electrical",
    bullets: [
      "Estimate to invoice handoff",
      "Panel upgrades and permits",
      "Card on file for repeat clients",
    ],
  },
  {
    title: "HVAC",
    bullets: [
      "Seasonal maintenance plans",
      "Recurring invoices for memberships",
      "ACH for large jobs",
    ],
  },
  {
    title: "Landscaping",
    bullets: [
      "Recurring weekly or monthly jobs",
      "Bulk invoice send",
      "Tip line and discounts",
    ],
  },
  {
    title: "Cleaning",
    bullets: [
      "Multi-site clients",
      "Invoice templates per site",
      "Missed service credit tracking",
    ],
  },
  {
    title: "General contracting",
    bullets: [
      "Change orders captured cleanly",
      "Retainage held and released",
      "Lien waiver attachments",
    ],
  },
];

function Card({ title, bullets }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 text-gray-600">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Built for crews that bill in the real world
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Barix focuses on trades and services. Pick your industry to see the workflows we support out of the box.
          </p>
        </section>

        {/* Grid */}
        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.title} title={g.title} bullets={g.bullets} />
          ))}
        </section>

        {/* CTA */}
        <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-semibold">Don't see your trade yet?</h2>
          <p className="mt-2 text-gray-600">
            We can tailor invoice templates and reminders to your workflow in a day.
          </p>
          <a
            href="/contact"
            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Talk to sales
          </a>
        </section>
      </main>
      <Footer />
    </div>
  );
}
