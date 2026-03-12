"use client";

import Image from "next/image";

const features = [
  {
    tag: "Invoicing",
    title: "Professional Invoices in Seconds",
    description: "Stop wasting time on paperwork. Create polished invoices with pre-saved line items, automatic tax calculations, and your company branding. Send via email or text before you even leave the job site.",
    highlights: [
      "Pre-saved services and materials",
      "Automatic tax calculations",
      "Custom branding and logo",
      "Photo attachments for completed work",
    ],
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    image: "/features/invoicing.png",
    hasImage: true,
    imageSize: { width: 550, height: 700 },
    reverse: false,
  },
  {
    tag: "Payments",
    title: "Get Paid Faster Than Ever",
    description: "Accept credit cards, debit cards, and ACH bank transfers. Clients pay online with one click—no more chasing checks or waiting for the mail. Funds hit your account fast.",
    highlights: [
      "Credit, debit, and ACH payments",
      "One-click payment for clients",
      "Instant payment notifications",
      "Optional instant payouts",
    ],
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    image: "/features/payments.png",
    hasImage: true,
    reverse: true,
  },
  {
    tag: "Automation",
    title: "Reminders That Work For You",
    description: "Set it and forget it. Automatic payment reminders go out on your schedule—gentle nudges before due dates and firmer follow-ups after. Optional late fees encourage on-time payment.",
    highlights: [
      "Customizable reminder schedule",
      "Automatic late fee application",
      "Email and SMS notifications",
      "Payment receipt automation",
    ],
    hideImage: true,
    reverse: false,
  },
];

export default function Features() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        {/* Section header */}
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-900">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Everything You Need to Run Your Business
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Powerful tools designed for trades and service businesses. No complexity, just results.
          </p>
        </div>

        {/* Feature blocks */}
        <div className="space-y-24">
          {features.map((feature, index) => (
            <div 
              key={feature.tag}
              className={`flex flex-col items-center gap-12 ${feature.hideImage ? 'max-w-2xl mx-auto' : 'lg:flex-row'} ${feature.reverse ? 'lg:flex-row-reverse' : ''}`}
            >
              {/* Content */}
              <div className={feature.hideImage ? 'text-center' : 'flex-1'}>
                <span className="inline-block rounded-full bg-gradient-to-r from-brand-900 to-brand-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                  {feature.tag}
                </span>
                
                <h3 className="mt-4 text-2xl font-bold text-brand-900 md:text-3xl">
                  {feature.title}
                </h3>
                
                <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
                
                <ul className="mt-6 space-y-3">
                  {feature.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100">
                        <svg className="h-4 w-4 text-brand-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-700">{highlight}</span>
                    </li>
                  ))}
                </ul>
                
                <a 
                  href={`/product#${feature.tag.toLowerCase()}`}
                  className="mt-8 inline-flex items-center gap-2 text-brand-900 font-semibold hover:text-brand-700 transition-colors"
                >
                  Learn more
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
              
              {/* Feature image */}
              {!feature.hideImage && (
                <div className="flex-1 flex justify-center">
                  <div className="relative max-w-lg">
                    <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-brand-900/20 to-brand-700/10 blur-xl opacity-60" />
                    <div className="relative overflow-hidden rounded-2xl border-2 border-gray-200 shadow-xl">
                      {feature.hasImage ? (
                        <Image
                          src={feature.image}
                          alt={feature.title}
                          width={feature.imageSize?.width || 450}
                          height={feature.imageSize?.height || 600}
                          className="block"
                        />
                      ) : (
                        <div className="p-8">
                          <div className="flex h-64 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100">
                            <div className="text-brand-900">
                              {feature.icon}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
