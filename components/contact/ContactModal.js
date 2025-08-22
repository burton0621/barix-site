"use client";

import ContactForm from "./ContactForm";

export default function ContactModal({ open, onOpenChange }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
          <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Talk to sales</h2>
                <p className="text-sm text-gray-600">
                  Tell us a bit about your business—we’ll set up a quick walkthrough.
                </p>
              </div>
              <button onClick={() => onOpenChange(false)} className="rounded-xl p-2 hover:bg-gray-100">
                ✕
              </button>
            </div>
            <ContactForm compact onSubmitted={() => onOpenChange(false)} />
          </div>
        </div>
      )}
    </>
  );
}
