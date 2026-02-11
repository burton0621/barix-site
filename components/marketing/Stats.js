"use client";

const stats = [
  {
    value: "50%",
    label: "Faster Payments",
    description: "Average reduction in time to get paid",
  },
  {
    value: "10hrs",
    label: "Saved Weekly",
    description: "Less time on invoicing and follow-ups",
  },
  {
    value: "99.9%",
    label: "Uptime",
    description: "Reliable platform you can count on",
  },
  {
    value: "24/7",
    label: "Support",
    description: "Help when you need it",
  },
];

export default function Stats() {
  return (
    <section className="bg-brand-900 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-bold text-white md:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-lg font-semibold text-brand-200">
                {stat.label}
              </div>
              <div className="mt-1 text-sm text-brand-400">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
