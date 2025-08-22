export default function ValueProps() {
  const items = [
    { t: "Invoice in seconds", d: "Pre-filled client data, smart line items, taxes, and job photos." },
    { t: "Get paid faster", d: "Card & ACH with automatic late fees and gentle reminders." },
    { t: "Made for trades", d: "Plumbers, electricians, HVAC, landscaping—built around site work." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((i) => (
          <div key={i.t} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">{i.t}</h3>
            <p className="mt-2 text-sm text-gray-600">{i.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
