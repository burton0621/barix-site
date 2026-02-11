"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import Navbar from "@/components/Navbar/Navbar";
import Hero from "@/components/marketing/Hero";
import ValueProps from "@/components/marketing/ValueProps";
import Features from "@/components/marketing/Features";
import HowItWorks from "@/components/marketing/HowItWorks";
import Stats from "@/components/marketing/Stats";
import Testimonial from "@/components/marketing/Testimonial";
import TrustBadges from "@/components/marketing/TrustBadges";
import CTASection from "@/components/marketing/CTASection";
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
    <div className="min-h-screen bg-white">
      <Navbar onOpenContact={() => setContactOpen(true)} />

      <main>
        {/* Hero with bold headline and product screenshot */}
        <Hero onOpenContact={() => setContactOpen(true)} />
        
        {/* Trust badges - Stripe, security, etc */}
        <TrustBadges />
        
        {/* Core value propositions */}
        <ValueProps />
        
        {/* Detailed feature sections */}
        <Features />
        
        {/* Stats section */}
        <Stats />
        
        {/* How it works - 3 step process */}
        <HowItWorks />

        {/* Interactive demo section */}
        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-900">
              See It In Action
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
              Your Billing Dashboard
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Track invoices, monitor payments, and manage your billing—all from one simple dashboard.
            </p>
          </div>

          <div id="demo" className="scroll-mt-28" />

          <DemoFrame
            title="app.barixbilling.com"
            ratio="16/10"
            caption="Sample dashboard. Mock data for demonstration."
          >
            <ClientPanel />
          </DemoFrame>
          
          <div className="mt-6 text-center">
            <a
              href="/contact"
              className="text-brand-900 font-medium underline-offset-4 hover:underline"
            >
              Want a private walkthrough? Let's talk →
            </a>
          </div>
        </section>
        
        {/* Social proof / testimonial */}
        <Testimonial />
        
        {/* Final CTA section */}
        <CTASection onOpenContact={() => setContactOpen(true)} />
      </main>

      <Footer onOpenContact={() => setContactOpen(true)} />
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
