"use client";

const STATUS = {
  Paid: "text-green-700 bg-green-50 ring-1 ring-green-200",
  Overdue: "text-red-700 bg-red-50 ring-1 ring-red-200",
  BalanceDue: "text-amber-700 bg-amber-50 ring-1 ring-amber-200",
};

const rows = [
  { id: "INV-1047", job: "Water heater install", date: "Aug 1, 2025", due: "Aug 15, 2025", amt: 1280, status: "Paid" },
  { id: "INV-1048", job: "Basement rough-in",   date: "Aug 3, 2025", due: "Aug 17, 2025", amt: 4200, status: "Overdue" },
  { id: "INV-1050", job: "Bathroom remodel",    date: "Aug 7, 2025", due: "Aug 21, 2025", amt: 6120, status: "BalanceDue" },
];

export default function ClientPanel() {
  return (
    <div className="h-full w-full">
      {/* top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="text-sm font-medium text-gray-700">demo.barixbilling.com</div>
        <div className="text-xs text-gray-500">Client view</div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 border-b border-gray-100 p-4 sm:grid-cols-3">
        <KPI title="Balance due" value="$10,320" sub="2 open invoices" />
        <KPI title="Last invoice" value="$1,280" sub="Paid Aug 2" />
        <KPI title="Next payout" value="Aug 22" sub="ACH, 2 queued" />
      </div>

      {/* table */}
      <div className="overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-gray-500">
            <tr>
              <TH>Invoice #</TH>
              <TH>Job</TH>
              <TH>Issue date</TH>
              <TH>Due date</TH>
              <TH className="text-right">Amount</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className="align-middle">
                <TD>{r.id}</TD>
                <TD className="min-w-56">{r.job}</TD>
                <TD>{r.date}</TD>
                <TD>{r.due}</TD>
                <TD className="text-right font-medium">${r.amt.toLocaleString()}</TD>
                <TD>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${STATUS[r.status]}`}>
                    {r.status}
                  </span>
                </TD>
                <TD className="text-right">
                  <a href="#" className="rounded-lg border border-gray-200 px-2 py-1 hover:bg-gray-50">View</a>
                  <a href="#" className="ml-2 rounded-lg bg-gray-900 px-2 py-1 text-white hover:bg-gray-800">Edit</a>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ title, value, sub }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}
function TH({ children, className = "" }) {
  return <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>;
}
function TD({ children, className = "" }) {
  return <td className={`px-3 py-3 ${className}`}>{children}</td>;
}
