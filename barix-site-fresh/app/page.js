// app/page.js
'use client';

import ContactForm from "./components/ContactForm";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/Barix%20Full%20Logo.png" alt="Barix" className="h-8 w-auto" />
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#product" className="hover:text-slate-600">Product</a>
            <a href="#pricing" className="hover:text-slate-600">Pricing</a>
            <a href="#company" className="hover:text-slate-600">Company</a>
          </nav>
          <a
            href="https://calendly.com/your-handle/10min-demo"
            className="inline-flex rounded-xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
          >
            Book Demo
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Made for contractors
          </span>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold leading-tight">
            Get paid faster. <span className="text-slate-500">Run smarter.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Create clean invoices in seconds, accept card & ACH online, and see who owes what at a glance.
            Keep your QuickBooks — Barix just makes it faster.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="https://calendly.com/your-handle/10min-demo"
               className="inline-flex items-center rounded-xl px-5 py-3 font-semibold bg-slate-900 text-white hover:bg-slate-800">
              Book a 10-min demo
            </a>
            <a href="#contact"
               className="inline-flex items-center rounded-xl px-5 py-3 font-semibold border border-slate-300 hover:bg-slate-100">
              Join the early list
            </a>
            <ContactForm />
          </div>
          <p className="mt-3 text-sm text-slate-500">No long contracts. Starter plan free.</p>
        </div>

        {/* Product mock */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">New Invoice</div>
            <div className="text-xs text-slate-500">#INV-1042</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-slate-500">Customer</label>
              <div className="mt-1 rounded-lg border border-slate-300 px-3 py-2">Acme Roofing</div>
            </div>
            <div>
              <label className="text-slate-500">Due date</label>
              <div className="mt-1 rounded-lg border border-slate-300 px-3 py-2">09/15/2025</div>
            </div>
            <div className="col-span-2">
              <label className="text-slate-500">Description</label>
              <div className="mt-1 rounded-lg border border-slate-300 px-3 py-2">Tear-off & install 30-yr shingles</div>
            </div>
            <div>
              <label className="text-slate-500">Amount</label>
              <div className="mt-1 rounded-lg border border-slate-300 px-3 py-2">$12,800.00</div>
            </div>
            <div>
              <label className="text-slate-500">Status</label>
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">• Ready to send</div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-slate-500">Card • ACH • Financing options</div>
            <button className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800">Send invoice</button>
          </div>
        </div>
      </section>

      {/* Product summary */}
      <section id="product" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold">Why contractors pick Barix</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {[
              ["Invoice in seconds", "Trade-friendly templates with deposits, photos, and tax lines."],
              ["Accept cards & ACH", "Get paid online with one click. Money lands fast."],
              ["Automatic reminders", "Gentle nudges before/after due dates — we chase payments."],
              ["QuickBooks sync", "Keep your books clean. Barix pushes invoices & payments over."],
              ["Cashflow dashboard", "See who owes what and projected deposits at a glance."],
              ["Mobile friendly", "Quote on site, send from the truck, get paid on the spot."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="font-semibold">{title}</div>
                <p className="mt-2 text-sm text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company */}
      <section id="company" className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-xl font-bold">About Barix</h3>
        <p className="mt-4 text-slate-600">
          Barix is building the operating layer for small trades businesses — starting with billing.
          We help contractors get paid faster, keep cashflow predictable, and spend less time on admin.
          Our roadmap includes integrated payments, financing, and insights that grow with your business.
        </p>
      </section>

      {/* Contact / capture (no onSubmit handler) */}
      <section id="contact" className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl font-bold">Be first to onboard</h3>
            <p className="mt-2 text-slate-300">Drop your email and we’ll send a setup link or book a 10-minute call.</p>
          </div>
          <form className="flex gap-3" action="#" method="post">
            <input type="email" required placeholder="you@company.com"
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-white/40" />
            <button className="rounded-xl bg-white text-slate-900 px-5 py-3 font-semibold hover:bg-slate-100" type="submit">
              Notify me
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-sm text-slate-500 flex flex-wrap items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Barix. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="mailto:hello@barixbilling.com" className="hover:text-slate-700">hello@barixbilling.com</a>
            <a href="https://calendly.com/your-handle/10min-demo" className="hover:text-slate-700">Book demo</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
