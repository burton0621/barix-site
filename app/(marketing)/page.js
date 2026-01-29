"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import Navbar from "@/components/Navbar/Navbar";
import Hero from "@/components/marketing/Hero";
import ValueProps from "@/components/marketing/ValueProps";
import LogoCloud from "@/components/marketing/LogoCloud";
import Footer from "@/components/marketing/Footer";
import ContactModal from "@/components/contact/ContactModal";
import DemoFrame from "@/components/marketing/DemoFrame";
import ClientPanel from "@/components/marketing/ClientPanel";

export default function HomePage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (user) {
        router.replace("/dashboard");
        return;
      }

      // No user → safe to show landing page
      setAuthChecked(true);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace("/dashboard");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  //Prevent landing page flash while auth is resolving
  if (!authChecked) {
    return null; // or a spinner if you prefer
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar onOpenContact={() => setContactOpen(true)} />

      <main>
        <Hero onOpenContact={() => setContactOpen(true)} />
        <ValueProps />
        <LogoCloud />

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight">
              Sample Demo
            </h3>
            <a
              href="/contact"
              className="text-sm text-brand underline-offset-4 hover:underline"
            >
              Need a private walkthrough?
            </a>
          </div>

          <div id="demo" className="scroll-mt-28" />

          <DemoFrame
            title="demo.barixbilling.com"
            ratio="16/10"
            caption="Sample client dashboard. Mock data."
          >
            <ClientPanel />
          </DemoFrame>
        </section>
      </main>

      <Footer onOpenContact={() => setContactOpen(true)} />
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
