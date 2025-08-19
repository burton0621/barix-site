export const metadata = {
  title: "Barix — Get paid faster. Run smarter.",
  description: "Barix Billing helps contractors send invoices, accept payments, and track cashflow.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
