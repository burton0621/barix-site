"use client";

// Payment method SVG icons
const VisaIcon = () => (
  <svg viewBox="0 0 48 16" className="h-8 w-auto" fill="#1A1F71">
    <path d="M19.4 1l-4.2 14h-3.4L15.9 1h3.5zm14.3 9l1.8-4.9 1 4.9h-2.8zm3.8 5h3.2L38 1h-2.9c-.7 0-1.2.4-1.5 1l-5.2 13h3.6l.7-2h4.4l.4 2zm-9.5-4.6c0-3.6-5-3.8-5-5.4 0-.5.5-1 1.5-1.1 1.3-.1 2.6.2 3.5.7l.6-2.9c-.8-.4-2-.7-3.4-.7-3.6 0-6.1 1.9-6.1 4.6 0 2 1.8 3.1 3.2 3.8 1.4.7 1.9 1.2 1.9 1.8 0 1-.9 1.4-1.8 1.4-1.5 0-2.4-.4-3.1-.7l-.5 2.9c.7.3 2 .6 3.4.6 3.8 0 6.3-1.9 6.3-4.7l-.5-.3zM15.6 1L9.8 15H6.1L3.2 3.6c-.2-.7-.4-.9-.9-1.2-.9-.5-2.3-1-3.6-1.3L-1 1h5.8c.7 0 1.4.5 1.6 1.4l1.4 7.5 3.5-8.9h3.6z"/>
  </svg>
);

const MastercardIcon = () => (
  <svg viewBox="0 0 48 30" className="h-8 w-auto">
    <circle cx="18" cy="15" r="12" fill="#EB001B"/>
    <circle cx="30" cy="15" r="12" fill="#F79E1B"/>
    <path d="M24 5.5c2.9 2.3 4.8 5.8 4.8 9.5s-1.9 7.2-4.8 9.5c-2.9-2.3-4.8-5.8-4.8-9.5s1.9-7.2 4.8-9.5z" fill="#FF5F00"/>
  </svg>
);

const AmexIcon = () => (
  <svg viewBox="0 0 48 16" className="h-8 w-auto" fill="#006FCF">
    <path d="M0 0h48v16H0z" fill="#006FCF"/>
    <path d="M5 11h2.3l.5-1.2h2.4l.5 1.2H13L10.2 5H7.8L5 11zm3.4-3.4l.8-2 .8 2h-1.6zM13 11h2.2V8.1L17.4 11h2.4V5h-2.2v2.8L15.5 5h-2.5v6zm8.4 0h2.2V8.6l2.5-3.6h-2.5l-1.2 2-1.2-2h-2.5l2.5 3.6V11h.2zm5.6 0h6V9.5h-3.8V8.7h3.7V7.3h-3.7v-.7h3.8V5h-6v6zm6.8 0h2.2l1.6-2 1.6 2H42l-2.7-3L42 5h-2.4l-1.6 2-1.6-2h-2.4l2.7 3-2.9 3z" fill="white"/>
  </svg>
);

const DiscoverIcon = () => (
  <svg viewBox="0 0 48 16" className="h-8 w-auto">
    <rect width="48" height="16" rx="2" fill="#FF6600"/>
    <path d="M7 11h1.8V5H7v6zm4.2-4.2c0-.7.5-1.1 1.2-1.1.5 0 1 .3 1.2.7l1.4-.8c-.5-.9-1.5-1.4-2.6-1.4-1.8 0-3 1.2-3 2.8 0 1.7 1.3 2.8 3 2.8 1.1 0 2.1-.5 2.6-1.4l-1.4-.8c-.2.4-.7.7-1.2.7-.7 0-1.2-.4-1.2-1.1v-.4zm6.8.2c-.7-.2-1-.3-1-.6 0-.2.2-.4.6-.4.4 0 .8.2 1.1.5l.9-1.1c-.5-.5-1.2-.8-2-.8-1.2 0-2.1.7-2.1 1.7 0 1 .6 1.5 1.8 1.8.7.2 1 .3 1 .6 0 .3-.3.5-.7.5-.5 0-1-.3-1.3-.7l-.9 1.1c.5.6 1.3 1 2.2 1 1.3 0 2.2-.7 2.2-1.8 0-1-.6-1.5-1.8-1.8zm2.8 1.6c0 1.4 1.1 2.4 2.6 2.4.7 0 1.3-.2 1.8-.5V9.2c-.5.4-.9.6-1.5.6-.8 0-1.4-.5-1.4-1.3 0-.7.6-1.3 1.4-1.3.6 0 1 .2 1.5.6V6.5c-.5-.3-1.1-.5-1.8-.5-1.5 0-2.6 1-2.6 2.4v.2zm6.8.2l-1.7-3.8h-2l2.8 6h1.8l2.8-6h-2L27.6 9zm5.2 2h4.5v-1.4h-2.7V8.8h2.6V7.5h-2.6V6.8h2.7V5.4h-4.5V11zm6.2 0h1.8V8.1h.6l1.5 2.9h2.1l-1.8-3.2c.9-.4 1.4-1.2 1.4-2.1 0-1.3-1-2.3-2.5-2.3H39v8.6zm1.8-4.8V6.6h1c.6 0 1 .3 1 .8 0 .5-.4.8-1 .8h-1z" fill="white"/>
  </svg>
);

const ACHIcon = () => (
  <div className="flex h-8 items-center rounded bg-gray-800 px-3">
    <span className="text-sm font-bold text-white">ACH</span>
  </div>
);

const ApplePayIcon = () => (
  <svg viewBox="0 0 50 20" className="h-8 w-auto" fill="currentColor">
    <path d="M9.6 4.8c-.6.7-1.5 1.2-2.4 1.1-.1-1 .4-2 .9-2.6.6-.7 1.6-1.2 2.4-1.2.1 1-.3 2-.9 2.7zm.9 1.4c-1.3-.1-2.4.7-3 .7-.6 0-1.5-.7-2.5-.7C3.6 6.3 2.3 7.4 1.6 9c-1.5 2.6-.4 6.4 1 8.5.7 1 1.5 2.2 2.6 2.1 1-.1 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.6 1.1 0 1.8-1 2.5-2.1.8-1.2 1.1-2.3 1.1-2.4-1.2-.4-2.2-1.8-2.2-3.4 0-1.4.7-2.5 1.7-3.3-.9-1.2-2.2-1.4-2.7-1.4l-.5.3zm9.9-2.6v16h2.3v-5.5h3.2c2.9 0 5-2 5-5.3 0-3.3-2-5.2-4.9-5.2h-5.6zm2.3 2h2.6c2 0 3.1 1 3.1 2.8 0 1.8-1.1 2.8-3.1 2.8h-2.6v-5.6zm11.4 14.2c1.4 0 2.8-.7 3.4-1.9h.1v1.8H40V9.8c0-2.4-1.9-3.9-4.8-3.9-2.7 0-4.7 1.6-4.8 3.7h2.2c.2-1 1.2-1.7 2.5-1.7 1.6 0 2.5.7 2.5 2.1v.9l-3.3.2c-3 .2-4.7 1.4-4.7 3.6 0 2.2 1.7 3.7 4.1 3.7h.4zm.6-1.8c-1.4 0-2.3-.7-2.3-1.7 0-1.1.8-1.7 2.4-1.8l2.9-.2v.9c0 1.6-1.4 2.8-3 2.8zm7.6 6.5c2.3 0 3.3-.9 4.3-3.5l4.1-11.5h-2.4l-2.8 8.9h-.1l-2.8-8.9h-2.4l4 11.1-.2.7c-.4 1.2-1 1.6-2 1.6-.2 0-.6 0-.8-.1v1.8c.2 0 .8.1 1.1.1v-.2z"/>
  </svg>
);

const GooglePayIcon = () => (
  <svg viewBox="0 0 50 20" className="h-8 w-auto">
    <path fill="#4285F4" d="M23.8 10.1v3.8h-1.2V4.3h3.2c.8 0 1.5.3 2 .8.6.5.8 1.2.8 1.9 0 .8-.3 1.4-.8 1.9-.5.5-1.2.8-2 .8h-2v.4zm0-4.6v3.5h2c.5 0 .9-.2 1.2-.5.3-.3.5-.7.5-1.2 0-.5-.2-.9-.5-1.2-.3-.3-.7-.5-1.2-.5h-2v-.1z"/>
    <path fill="#34A853" d="M31.2 7.4c.9 0 1.6.2 2.1.7.5.5.8 1.2.8 2v4.2h-1.2v-.9h-.1c-.5.8-1.1 1.1-2 1.1-.7 0-1.3-.2-1.8-.6-.4-.4-.7-.9-.7-1.5 0-.7.2-1.2.7-1.6.5-.4 1.1-.6 1.9-.6.7 0 1.3.1 1.7.4v-.3c0-.4-.2-.8-.5-1-.3-.3-.7-.4-1.1-.4-.6 0-1.1.3-1.4.8l-1.1-.7c.5-.7 1.2-1.1 2.2-1.1h.5zm-1.6 4.5c0 .3.1.6.4.8.3.2.6.3.9.3.5 0 1-.2 1.3-.6.4-.4.6-.8.6-1.3-.4-.3-.9-.4-1.5-.4-.5 0-.9.1-1.2.3-.3.3-.5.5-.5.9z"/>
    <path fill="#4285F4" d="M40.5 7.6l-4.2 9.6h-1.2l1.5-3.4-2.7-6.2h1.3l2 4.7h.1l1.9-4.7h1.3z"/>
    <path fill="#EA4335" d="M15.3 9.3c0-.4 0-.7-.1-1.1H8.5v2h3.8c-.2.9-.7 1.6-1.4 2.1v1.7h2.3c1.3-1.2 2.1-3 2.1-4.7z"/>
    <path fill="#FBBC04" d="M8.5 15.7c1.9 0 3.5-.6 4.7-1.7l-2.3-1.8c-.6.4-1.4.7-2.4.7-1.9 0-3.4-1.3-4-3h-2.4v1.8c1.2 2.4 3.6 4 6.4 4z"/>
    <path fill="#34A853" d="M4.5 9.9c-.2-.5-.2-1.1 0-1.6V6.5H2.1c-.6 1.2-.6 2.6 0 3.8l2.4-1.4v1z"/>
    <path fill="#EA4335" d="M8.5 5.3c1 0 2 .4 2.7 1.1l2-2C12 3.1 10.4 2.5 8.5 2.5c-2.8 0-5.2 1.6-6.4 4l2.4 1.8c.6-1.7 2.1-3 4-3z"/>
  </svg>
);

const logos = [
  { component: <VisaIcon />, alt: "Visa" },
  { component: <MastercardIcon />, alt: "Mastercard" },
  { component: <AmexIcon />, alt: "American Express" },
  { component: <DiscoverIcon />, alt: "Discover" },
  { component: <ACHIcon />, alt: "ACH Bank Transfer" },
  { component: <ApplePayIcon />, alt: "Apple Pay" },
  { component: <GooglePayIcon />, alt: "Google Pay" },
];

function LogoRow() {
  return (
    <ul className="flex shrink-0 items-center gap-10">
      {logos.map((logo, i) => (
        <li key={logo.alt + i} className="flex h-10 w-28 items-center justify-center">
          {logo.component}
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
