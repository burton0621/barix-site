export const metadata = {
  title: "Barix — Get paid faster. Run smarter.",
  description: "Barix helps contractors send invoices, accept payments, and track cashflow.",
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
