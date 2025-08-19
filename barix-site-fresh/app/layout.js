// app/layout.js
export const metadata = {
  title: "Barix Billing — Get paid faster. Run smarter.",
  description:
    "Barix helps contractors send invoices in seconds, accept cards & ACH, and track cashflow — without spreadsheet headaches.",
  openGraph: {
    title: "Barix Billing — Get paid faster. Run smarter.",
    description:
      "Send invoices in seconds. Accept cards & ACH. Simple cashflow tracking.",
    url: "https://barixbilling.com",
    siteName: "Barix Billing",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
