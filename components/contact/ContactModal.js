"use client";

import { useState } from "react";

export default function ContactModal({ open, onOpenChange }) {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");

    const formEl = e.currentTarget;
    const data = new FormData(formEl);

    try {
      const res = await fetch("https://formspree.io/f/manbgode", {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        setStatus("success");
        formEl.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => onOpenChange && onOpenChange(false)}
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl transition-all ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Talk to Sales</h3>
          <p className="text-sm text-gray-500">
            Tell us a bit about your team and what you want Barix to handle.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          action="https://formspree.io/f/manbgode"
          method="POST"
          className="space-y-3"
        >
          <input type="hidden" name="_subject" value="New Barix contact" />
          <input type="text" name="_gotcha" className="hidden" tabIndex={-1} autoComplete="off" />

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@company.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:ring-brand"
            />
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              name="name"
              placeholder="Jane Doe"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:ring-brand"
            />
          </div>

          {/* Phone number */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              name="phone"
              placeholder="(555) 123-4567"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:ring-brand"
            />
          </div>

          {/* Business name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Business</label>
            <input
              type="text"
              name="business"
              placeholder="ACME Plumbing Co."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:ring-brand"
            />
          </div>

          {/* Message */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Message *</label>
            <textarea
              name="message"
              required
              rows={4}
              placeholder="Quick context on your workflow, crew size, and what you want Barix to handle."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:ring-brand"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {status === "loading" ? "Sending…" : "Send message"}
          </button>

          {status === "success" && (
            <p className="text-center text-sm text-green-600">✅ Thank you — we’ll reach out shortly.</p>
          )}
          {status === "error" && (
            <p className="text-center text-sm text-red-600">❌ Something went wrong. Please try again.</p>
          )}
        </form>

        <button
          onClick={() => onOpenChange && onOpenChange(false)}
          className="mt-3 w-full rounded-xl bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          type="button"
        >
          Close
        </button>
      </div>
    </div>
  );
}
