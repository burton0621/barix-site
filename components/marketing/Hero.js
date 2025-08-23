"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function Hero({ onOpenContact }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-8 pt-12">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            We Bill,{" "}
            <span className="font-extrabold italic text-brand">
              You Build.
            </span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Billing software for trades & services - create invoices in seconds,
            collect payments, and automate reminders so your crew can stay on the tools.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={onOpenContact}>Book a demo</Button>
            <a
              href="#demo"
              className="inline-flex h-11 items-center rounded-2xl border border-gray-300 px-5 text-gray-900 hover:bg-gray-50"
            >
              See sample demo
            </a>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Become an early adopter and get special pricing.
          </p>
        </div>

        {/* Right column hero image */}
        <div>
          {/* IMPORTANT: this box must be relative for Image fill to work */}
          <div className="relative mx-auto max-w-md">
          <Image
            src="/hero/barix-hero-1920.webp"
            alt="Tradesperson reviewing invoices on a tablet"
            width={500}
            height={320}
            className="rounded-2xl border border-gray-200 shadow-sm object-cover"
          />
            {/* Mobile (lighter) */}
            <Image
              src="/hero/barix-hero-768.webp"
              alt="Tradesperson reviewing invoices on a tablet"
              fill
              priority
              className="md:hidden"
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "50% 55%" }} // mobile focus
            />
          </div>
        </div>
      </div>
    </section>
  );
}
