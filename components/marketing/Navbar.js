"use client";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function Navbar({ onOpenContact }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <a href="/" className="flex items-center gap-2">
          {/* static import supplies width/height automatically */}
          <Image src="/logo.png" alt="Barix" width={160} height={40} priority />
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          <a href="/product" className="text-sm text-gray-700 hover:text-brand-900">Product</a>
          <a href="/pricing" className="text-sm text-gray-700 hover:text-brand-900">Pricing</a>
          <a href="/industries" className="text-sm text-gray-700 hover:text-brand-900">Industries</a>
          <Button onClick={onOpenContact} className="ml-2">Book a demo</Button>
        </nav>

        <Button onClick={onOpenContact} className="md:hidden" variant="outline" size="sm">
          Contact
        </Button>
      </div>
    </header>
  );
}
