// app/layout.js
import "./globals.css";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Barix — Billing for Trades & Services",
  description: "We Bill, You Build. Invoices, payments, reminders—done.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50 text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}

