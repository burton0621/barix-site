"use client";
import Image from "next/image";

const logos = [
  { src: "/payments/visa.png",        alt: "Visa",        scale: 1.00 },
  { src: "/payments/mastercard.png",  alt: "Mastercard",  scale: 1.0 },
  { src: "/payments/amex.png",        alt: "Amex",        scale: 1.05 },
  { src: "/payments/discover.png",    alt: "Discover",    scale: 1.08 },
  { src: "/payments/ach.png",         alt: "ACH",         scale: 1.45 },
  { src: "/payments/apple-pay.png",   alt: "Apple Pay",   scale: 2 },
  { src: "/payments/google-pay.png",  alt: "Google Pay",  scale: 2 },
];

function LogoRow() {
  return (
    <ul className="flex shrink-0 items-center gap-10">
      {logos.map((l, i) => (
        <li key={l.alt + i} className="relative h-10 w-28">
          {/* Scale the wrapper, keep the cell stable */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `scale(${l.scale})`, transformOrigin: "center" }}
          >
            <Image src={l.src} alt={l.alt} fill className="object-contain" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function LogoCloud() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-center text-med font-semibold text-grey-700 -mt-1 mb-2">
          Payment methods we support
        </p>

        <div className="relative group mt-5 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />

          <div className="marquee flex items-center">
            <LogoRow />
            <LogoRow /> {/* duplicate for seamless loop */}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee { animation: marquee 22s linear infinite; will-change: transform; }
        .group:hover .marquee { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .marquee { animation: none; transform: none; }
        }
      `}</style>
    </section>
  );
}
