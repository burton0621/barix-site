"use client";

export default function Testimonial() {
  return (
    <section className="bg-brand-900 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center">
        {/* Quote icon */}
        <div className="mb-8 flex justify-center">
          <svg className="h-12 w-12 text-brand-400/50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
        </div>

        {/* Quote text */}
        <blockquote className="text-2xl font-medium leading-relaxed text-white md:text-3xl">
          "Before Barix, I was spending hours every week chasing invoices. Now I send them from my truck and get paid the same day. It's been a game-changer for my plumbing business."
        </blockquote>

        {/* Attribution */}
        <div className="mt-10 flex flex-col items-center">
          {/* Avatar placeholder */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-700 text-2xl font-bold text-white">
            TK
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Tyler Kelley</p>
            <p className="text-brand-300">Owner, Kelley Dreamworks</p>
          </div>
        </div>

        {/* Company logo placeholder - uncomment when you have real logos */}
        {/* <div className="mt-8 flex justify-center opacity-60">
          <img src="/testimonials/johnson-plumbing-logo.png" alt="Johnson Plumbing" className="h-8" />
        </div> */}
      </div>
    </section>
  );
}
