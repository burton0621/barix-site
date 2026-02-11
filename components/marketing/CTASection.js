"use client";

import { Button } from "@/components/ui/Button";

export default function CTASection({ onOpenContact }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-brand-400 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-96 w-96 rounded-full bg-brand-300 blur-3xl" />
      </div>
      
      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
          Ready to Simplify Your Billing?
        </h2>
        
        <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-200">
          Join contractors who've already made the switch. Get set up in minutes, start getting paid faster today.
        </p>
        
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button 
            onClick={onOpenContact}
            className="inline-flex h-12 items-center justify-center rounded-2xl border-2 border-white bg-transparent px-8 text-base font-semibold text-white transition-all hover:bg-white hover:text-brand-900"
          >
            Book a Demo
          </button>
          <a
            href="/register"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-8 text-base font-semibold text-brand-900 shadow-xl transition hover:bg-gray-100"
          >
            Start Free Trial
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
        
        <p className="mt-6 text-sm text-brand-400">
          No credit card required • Free 14-day trial • Cancel anytime
        </p>
      </div>
    </section>
  );
}
