"use client";

const STATUS_STYLES = {
  paid: "text-green-700 bg-green-50 ring-1 ring-green-200",
  overdue: "text-red-700 bg-red-50 ring-1 ring-red-200",
  sent: "text-amber-700 bg-amber-50 ring-1 ring-amber-200",
};

const rows = [
  { id: "INV-1047", client: "Johnson Residence", date: "Jan 15, 2026", amt: 1280, status: "paid" },
  { id: "INV-1048", client: "Smith Commercial",  date: "Jan 18, 2026", amt: 4200, status: "overdue" },
  { id: "INV-1050", client: "Garcia Property",   date: "Jan 22, 2026", amt: 6120, status: "sent" },
  { id: "INV-1051", client: "Wilson Home",       date: "Jan 28, 2026", amt: 890, status: "paid" },
];

export default function ClientPanel() {
  return (
    <div className="h-full w-full bg-gray-50">
      {/* Dashboard header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Welcome back, Demo Company</h1>
            <p className="text-sm text-gray-500">Here's what's happening with your invoicing today.</p>
          </div>
          <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Create Invoice
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 p-6 sm:grid-cols-4">
        <StatCard label="Total Invoices" value="24" sub="Non-draft invoices" />
        <StatCard label="Pending Payments" value="$10,320" sub="3 sent invoices" color="amber" />
        <StatCard label="Total Revenue" value="$45,280" sub="18 paid invoices" color="green" />
        <StatCard label="Overdue" value="$4,200" sub="1 overdue invoice" color="red" />
      </div>

      {/* Recent activity table */}
      <div className="mx-6 mb-6 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs text-gray-500">
              <tr>
                <TH>Invoice #</TH>
                <TH>Client</TH>
                <TH>Issue Date</TH>
                <TH className="text-right">Amount</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-middle hover:bg-gray-50">
                  <TD className="font-medium text-gray-900">{r.id}</TD>
                  <TD>{r.client}</TD>
                  <TD>{r.date}</TD>
                  <TD className="text-right font-medium">${Number(r.amt).toLocaleString()}</TD>
                  <TD>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[r.status] || "text-gray-700 bg-gray-50 ring-1 ring-gray-200"}`}
                    >
                      {r.status}
                    </span>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  const colorStyles = {
    green: "text-green-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${colorStyles[color] || "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}

function TH({ children, className = "" }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>;
}

function TD({ children, className = "" }) {
  return <td className={`px-4 py-3 text-gray-600 ${className}`}>{children}</td>;
}
