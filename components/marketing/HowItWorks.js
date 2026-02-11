"use client";

const steps = [
  {
    number: "01",
    title: "Quick Setup",
    description: "Import your clients, add your services, and customize your invoice template. Get up and running in under 15 minutes.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Create & Send",
    description: "Build invoices from pre-saved line items. Add job photos, notes, and send via email or text—right from the job site.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Get Paid",
    description: "Clients pay online with card or ACH. Funds hit your bank account fast. Automatic reminders handle the follow-up.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-900">
            How It Works
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            From Job Site to Paid—Simple as That
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            No complicated software. No steep learning curve. Just straightforward billing that works the way you do.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line (hidden on mobile and last item) */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-16 hidden h-0.5 w-full bg-gradient-to-r from-brand-900/30 to-brand-700/10 md:block" />
              )}
              
              <div className="relative flex flex-col items-center text-center">
                {/* Number badge with gradient */}
                <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 text-white shadow-lg shadow-brand-900/25">
                  {step.icon}
                </div>
                
                {/* Step number */}
                <span className="mb-2 text-sm font-bold text-brand-700">{step.number}</span>
                
                <h3 className="mb-3 text-xl font-semibold text-brand-900">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
