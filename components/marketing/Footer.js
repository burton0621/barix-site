"use client";

import { Button } from "@/components/ui/Button";

export default function Footer({ onOpenContact }) {
  return (
    <footer className="bg-[#0B1D33] text-white">
      <div className="mx-auto max-w-6xl px-4 py-4">
        {/* Top row: three balanced columns */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand / blurb */}
          <div>
            <h3 className="text-lg font-semibold">Barix Billing</h3>
            <p className="mt-2 text-sm text-white/80">
              Billing without the chaos. Built for trades and service crews.
            </p>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                <a href="/privacy" className="hover:text-white">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/privacy/data" className="hover:text-white">
                  Data Policy
                </a>
              </li>
              <li>
                <a href="/privacy/cookies" className="hover:text-white">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-white">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact / CTA */}
          <div className="md:justify-self-end">
            <div className="flex items-center gap-3">
              <a
                href="mailto:info@barixbilling.com"
                className="text-sm text-white/80 hover:text-white"
              >
                info@barixbilling.com
              </a>
              {onOpenContact ? (
                <Button
                  size="sm"
                  onClick={onOpenContact}
                  className="bg-white text-[#0B1D33] hover:bg-gray-100"
                >
                  Talk to sales
                </Button>
              ) : (
                <a
                  href="/contact"
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#0B1D33] hover:bg-gray-100"
                >
                  Talk to sales
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Divider + bottom row */}
        <div className="mt-8 border-t border-white/15 pt-6 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Barix Billing LLC, Detroit MI
        </div>
      </div>
    </footer>
  );
}
