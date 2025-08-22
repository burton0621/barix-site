"use client";
import { useState } from "react";

export default function DemoFrame({
  title = "Barix Demo",
  src,
  ratio = "16/10",
  caption,
  children,           // ← add this
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Browser chrome */}
      <div className="flex items-center justify-between rounded-t-2xl bg-brand-900 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/90" />
        </div>

        <div className="mx-3 flex min-w-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-80">
            <path fill="currentColor" d="M21 10H7v4h14v-4ZM3 18h18v2H3v-2ZM3 4h18v2H3V4Zm4 6H3v4h4v-4Z" />
          </svg>
          <span className="truncate">demo.barixbilling.com</span>
        </div>

        <div className="text-xs text-white">{title}</div>
      </div>

      {/* Demo viewport */}
      <div className={`relative aspect-[${ratio}] overflow-hidden border-t border-gray-100`}>
        {/* soft grid while loading, hide only for iframe mode */}
        {!children && (
          <div className={`absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] transition-opacity ${loaded ? "opacity-0" : "opacity-100"}`} />
        )}

        {src ? (
          <iframe
            title={title}
            src={src}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            onLoad={() => setLoaded(true)}
            allow="fullscreen"
          />
        ) : (
          <div className="absolute inset-0 overflow-auto bg-white">
            {children}
          </div>
        )}
      </div>

      {caption ? (
        <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">{caption}</div>
      ) : null}
    </div>
  );
}
