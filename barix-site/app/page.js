export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2 font-semibold text-xl">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">B</span>
            <span>Barix</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-slate-600">Features</a>
            <a href="#pricing" className="hover:text-slate-600">Pricing</a>
            <a href="#faq" className="hover:text-slate-600">FAQ</a>
            <a href="#contact" className="hover:text-slate-600">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="#start" className="hidden sm:inline-flex rounded-xl px-4 py-2 text-sm font-medium border border-slate-300 hover:bg-slate-100">Book Demo</a>
            <a href="#start" className="inline-flex rounded-xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800">Start Free</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="home" className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
              Get paid faster. <span className="text-slate-500">Run smarter.</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              Barix Billing helps contractors send invoices in seconds, accept cards & ACH, and track every dollar—without the spreadsheet headache.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#start" className="inline-flex items-center rounded-xl px-5 py-3 font-semibold bg-slate-900 text-white hover:bg-slate-800">Send your first invoice free</a>
              <a href="#demo" className="inline-flex items-center rounded-xl px-5 py-3 font-semibold border border-slate-300 hover:bg-slate-100">Book a 10‑min setup</a>
            </div>
            <p className="mt-4 text-sm text-slate-500">No contracts. Cancel anytime. Keep using QuickBooks—Barix just makes it faster.</p>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
              {/* Faux app mock */}
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
                  <div className="mt-1 rounded-lg border border-slate-300 px-3 py-2">08/30/2025</div>
                </div>
                <div className="col-span-2">
                  <label className="text-slate-500">Description</label>
                  <div className="mt-1 rounded-lg border border-slate-300 px-3 py-2">Tear‑off & install 30‑yr shingles</div>
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
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm">
          <span>Trusted by contractors across Southeast Michigan</span>
          <span className="hidden sm:inline">•</span>
          <span>Roofing · HVAC · Electrical · Painting</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-3 gap-8">
          {[
            {
              title: 'Invoice in seconds',
              desc: 'Templates that speak your trade. Add line items, tax, deposits, and photos.',
            },
            {
              title: 'Accept cards & ACH',
              desc: 'Get paid online with one click. Funds land fast; customers love the convenience.',
            },
            {
              title: 'Automatic reminders',
              desc: 'Gentle nudges before/after due dates. You focus on work, we chase payments.',
            },
            {
              title: 'QuickBooks sync',
              desc: 'Stay tidy. Barix pushes invoices & payments to your books automatically.',
            },
            {
              title: 'Cashflow dashboard',
              desc: 'See who owes what, projected deposits, and month‑to‑date totals at a glance.',
            },
            {
              title: 'Mobile friendly',
              desc: 'Quote on site. Send from the truck. Get paid before you leave the driveway.',
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold">{f.title}</div>
              <p className="mt-2 text-slate-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Simple pricing that grows with you</h2>
            <p className="mt-3 text-slate-600">Start free. Upgrade when you need analytics and automation.</p>
          </div>
          <div className="mt-10 grid md:grid-cols-2 gap-6">
            {/* Starter */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-sm font-medium text-slate-600">Starter</div>
              <div className="mt-2 text-4xl font-bold">$0<span className="text-base font-medium text-slate-500">/mo</span></div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>Unlimited invoices</li>
                <li>Online payments (card/ACH)</li>
                <li>Basic dashboard</li>
                <li>Email support</li>
              </ul>
              <a href="#start" className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-white font-semibold hover:bg-slate-800">Start free</a>
              <p className="mt-3 text-xs text-slate-500">Standard payment fees apply.</p>
            </div>
            {/* Pro */}
            <div className="rounded-2xl border border-slate-900 bg-white p-6 shadow-lg">
              <div className="text-sm font-medium text-slate-600">Pro</div>
              <div className="mt-2 text-4xl font-bold">$39<span className="text-base font-medium text-slate-500">/mo</span></div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>Everything in Starter</li>
                <li>Automated reminders</li>
                <li>QuickBooks sync</li>
                <li>Advanced reports</li>
                <li>Priority support</li>
              </ul>
              <a href="#start" className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-white font-semibold hover:bg-slate-800">Upgrade to Pro</a>
              <p className="mt-3 text-xs text-slate-500">Add financing options at checkout (coming soon).</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
        <h3 className="text-2xl font-bold">Frequently asked</h3>
        <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {[
            {
              q: 'Do I need to switch from QuickBooks?',
              a: 'No. Keep your books as‑is. Barix handles invoicing & payments, then syncs to QuickBooks automatically.',
            },
            {
              q: 'What are the payment fees?',
              a: 'Standard card/ACH rates apply. Our goal is to give you the fastest payouts with simple, transparent pricing.',
            },
            {
              q: 'Can I try it first?',
              a: 'Yes. Start on the Starter plan and send unlimited invoices. Upgrade anytime for automation + analytics.',
            },
          ].map((item) => (
            <details key={item.q} className="group p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                {item.q}
                <span className="ml-4 text-slate-400 group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <p className="mt-3 text-slate-600 text-sm">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h3 className="text-2xl font-bold">Ready to get paid faster?</h3>
            <p className="mt-2 text-slate-300">Drop your email and we’ll send a setup link (or book a 10‑minute call).</p>
          </div>
          <form className="flex gap-3" onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder="you@company.com" className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder:text-slate-300 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-white/40" />
            <button className="rounded-xl bg-white text-slate-900 px-5 py-3 font-semibold hover:bg-slate-100">Notify me</button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-sm text-slate-500 flex flex-wrap items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Barix. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-700">Terms</a>
            <a href="#" className="hover:text-slate-700">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
