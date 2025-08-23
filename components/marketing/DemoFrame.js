"use client";

export default function DemoFrame({
  title = "demo.barixbilling.com",
  ratio = "16/10",     // keeps the framed look consistent
  caption,
  children,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* faux browser chrome */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/90" />
        </div>
        <div className="text-xs px-2 py-1 rounded-full bg-slate-800/70">{title}</div>
      </div>

      {/* content (your mock panel) */}
      <div className="bg-gray-50">
        <div className="w-full">{children}</div>
      </div>

      {caption && (
        <div className="px-4 py-3 text-sm text-gray-500 border-t">{caption}</div>
      )}
    </div>
  );
}
