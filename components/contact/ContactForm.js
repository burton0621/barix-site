"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function ContactForm({ compact = false, onSubmitted }) {
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    // TODO: wire to your API route or service
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSuccess(true);
    onSubmitted?.();
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Thanks! We’ll be in touch.</h3>
        <p className="mt-2 text-sm text-gray-600">
          You’ll get an email from us shortly to book a quick demo.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <form onSubmit={handleSubmit} className={`p-6 grid gap-4 ${compact ? "" : "md:grid-cols-2"}`}>
        <div>
          <label className="mb-1 block text-sm font-medium">Full name</label>
          <Input name="name" required placeholder="Jane Contractor" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Company</label>
          <Input name="company" placeholder="Barix Plumbing LLC" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <Input name="email" type="email" required placeholder="you@company.com" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone</label>
          <Input name="phone" type="tel" placeholder="(555) 123-4567" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">What do you need help with?</label>
          <Textarea name="message" rows={4} placeholder="Invoices, payment collection, reminders, etc." />
        </div>
        <div className="md:col-span-2 flex items-center justify-between">
          <p className="text-xs text-gray-500">By submitting, you agree to be contacted about Barix. No spam.</p>
          <Button disabled={loading} type="submit">{loading ? "Sending…" : "Request demo"}</Button>
        </div>
      </form>
    </div>
  );
}
