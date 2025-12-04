// app/layout.js
import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";  // added this

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  metadataBase: new URL("https://barixbilling.com"),
  title: {
    default: "Barix Billing - We Bill, You Build",
    template: "%s • Barix Billing",
  },
  description: "We Bill, You Build. Invoices, payments, reminders, done.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Barix Billing - We Bill, You Build",
    description: "Invoices, payments, reminders, done.",
    url: "https://barixbilling.com",
    siteName: "Barix Billing",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Barix Billing - We Bill, You Build",
    description: "Invoices, payments, reminders, done.",
    images: ["/twitter-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50 text-gray-900 antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
