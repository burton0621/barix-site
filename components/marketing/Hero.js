"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Hero({ onOpenContact }) {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-brand-100/50" />
      
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 md:pb-24 md:pt-28">
        {/* Centered headline section */}
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 inline-block rounded-full bg-gradient-to-r from-brand-900 to-brand-700 px-4 py-1.5 text-sm font-medium text-white">
            Billing software built for trades
          </p>
          
          <h1 className="text-5xl font-bold tracking-tight text-brand-900 md:text-6xl lg:text-7xl">
            We Bill,{" "}
            <span className="bg-gradient-to-r from-brand-900 via-brand-700 to-brand-500 bg-clip-text font-extrabold italic text-transparent">
              You Build.
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 md:text-xl">
            Create invoices in seconds, collect payments instantly, and automate reminders—so your crew can stay on the tools, not the paperwork.
          </p>
          
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link 
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-brand-900 to-brand-700 px-8 text-base font-semibold text-white shadow-lg shadow-brand-900/25 transition-all hover:from-brand-800 hover:to-brand-600 hover:shadow-xl hover:shadow-brand-900/30"
            >
              Get Started
            </Link>
            <Button size="lg" variant="outline" onClick={onOpenContact}>
              Book a Demo
            </Button>
          </div>
          
          <p className="mt-4 text-sm text-gray-500">
            Join early and lock in founder pricing. No credit card required.
          </p>
        </div>

      </div>
    </section>
  );
}
