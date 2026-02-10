const items = [
  { 
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Invoice in Seconds", 
    description: "Pre-filled client data, smart line items, taxes, and job photos. Send professional invoices before you leave the job site." 
  },
  { 
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Get Paid Faster", 
    description: "Accept cards and ACH instantly. Automatic late fees and gentle reminders do the follow-up so you don't have to." 
  },
  { 
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    title: "Built for the Trades", 
    description: "Plumbers, electricians, HVAC, landscaping—designed around how you actually work on job sites." 
  },
];

export default function ValueProps() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      {/* Section header */}
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
          Bill Smarter. Get Paid Faster.
        </h2>
        <p className="mt-4 text-lg text-gray-600">
          Stop chasing payments and shuffling paperwork. Barix handles the billing so you can focus on what you do best.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {items.map((item) => (
          <div 
            key={item.title} 
            className="group relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:border-brand-300 hover:shadow-lg hover:shadow-brand-900/10"
          >
            {/* Icon container with gradient on hover */}
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-900 transition-all group-hover:bg-gradient-to-br group-hover:from-brand-900 group-hover:to-brand-700 group-hover:text-white">
              {item.icon}
            </div>
            
            <h3 className="text-xl font-semibold text-brand-900">{item.title}</h3>
            <p className="mt-3 text-gray-600 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
