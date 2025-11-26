"use client";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function Navbar({ onOpenContact, onScrollDemo }) {
  const [open, setOpen] = useState(false);

  const DemoLink = ({ className = "" }) =>
    onScrollDemo ? (
      <button
        onClick={() => {
          setOpen(false);
          onScrollDemo();
        }}
        className={className}
      >
        See demo
      </button>
    ) : (
      <a href="#demo" onClick={() => setOpen(false)} className={className}>
        See demo
      </a>
    );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-100 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          {/* Mobile: hamburger on far left + logo */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <a href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
              <Image src="/logo.png" alt="Barix" width={120} height={30} priority />
            </a>
          </div>

          {/* Desktop logo (left) */}
          <a href="/" className="hidden items-center gap-2 md:flex">
            <Image src="/logo.png" alt="Barix" width={160} height={40} priority />
          </a>

          {/* Desktop nav (right) */}
          <nav className="hidden items-center gap-6 md:flex">
            <a href="/product" className="text-sm text-gray-700 hover:text-brand-900">Product</a>
            <a href="/pricing" className="text-sm text-gray-700 hover:text-brand-900">Pricing</a>
            <a href="/industries" className="text-sm text-gray-700 hover:text-brand-900">Industries</a>
            <DemoLink className="text-sm text-brand underline-offset-4 hover:underline" />
            <Button onClick={onOpenContact} className="ml-2">Book a demo</Button>
          </nav>

          {/* Mobile contact button (right) */}
          <Button onClick={onOpenContact} className="md:hidden" variant="outline" size="sm">
            Contact
          </Button>
        </div>
      </header>

      {/* Mobile slide-out menu (left drawer) */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            id="mobile-menu"
            className="absolute left-0 top-0 h-full w-80 max-w-[85%] bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <a href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                <Image src="/icon.png" alt="Barix" width={24} height={24} />
                <span className="text-sm font-semibold tracking-tight">Barix Billing</span>
              </a>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1 p-3">
              <a href="/product" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-50">Product</a>
              <a href="/pricing" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-50">Pricing</a>
              <a href="/industries" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-50">Industries</a>
              <DemoLink className="rounded-lg px-3 py-2 text-left text-sm text-brand hover:bg-gray-50" />
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenContact && onOpenContact();
                }}
                className="mt-2 rounded-xl bg-white px-3 py-2 text-left text-sm font-semibold text-brand ring-1 ring-inset ring-brand/20 hover:bg-gray-50"
              >
                Talk to sales
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
