'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [status, setStatus] = useState('idle');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');

    const res = await fetch('https://formspree.io/f/manbgode', {
      method: 'POST',
      body: new FormData(e.currentTarget),
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      setStatus('success');
      e.currentTarget.reset();
    } else {
      setStatus('error');
    }
  }

  return (
    <section id="contact" className="py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-2">Get in touch</h2>
        <p className="text-sm text-gray-500 mb-6">
          We’ll reply from <span className="font-medium">hello@barixbilling.com</span>.
        </p>

        <form
          action="https://formspree.io/f/manbgode"
          method="POST"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input type="text" name="_gotcha" className="hidden" tabIndex={-1} autoComplete="off" />

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
            <input id="name" name="name" required className="w-full rounded-xl border px-3 py-2 outline-none focus:ring" placeholder="Jane Doe" />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input id="email" name="email" type="email" required className="w-full rounded-xl border px-3 py-2 outline-none focus:ring" placeholder="jane@company.com" />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium mb-1">Company</label>
            <input id="company" name="company" className="w-full rounded-xl border px-3 py-2 outline-none focus:ring" placeholder="Company LLC" />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
            <textarea id="message" name="message" rows={5} required className="w-full rounded-xl border px-3 py-2 outline-none focus:ring" placeholder="Tell us about your billing workflow…" />
          </div>

          <button type="submit" disabled={status === 'sending'} className="w-full rounded-xl px-4 py-2 font-semibold shadow disabled:opacity-60">
            {status === 'sending' ? 'Sending…' : 'Send message'}
          </button>

          {status === 'success' && <p className="text-green-600 text-sm">Thanks! We’ll be in touch.</p>}
          {status === 'error' && <p className="text-red-600 text-sm">Something went wrong. Please try again.</p>}
        </form>
      </div>
    </section>
  );
}
