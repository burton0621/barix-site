"use client";

/*
  Dashboard Home Page
  -------------------
  This is the main landing page after a user logs in.
  It will eventually show:
  - Overview stats (total invoices, pending payments, revenue)
  - Recent invoices
  - Quick actions (create invoice, add client)
  
  For now, it's a placeholder that welcomes the user and
  guides them to set up their profile or start invoicing.
*/

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/providers/AuthProvider";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";

export default function DashboardPage() {
  const router = useRouter();
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);

  /*
    Check if user is authenticated
    If not, redirect them to login
  */
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar />
      
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Welcome Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back{profile?.company_name ? `, ${profile.company_name}` : ""}
          </h1>
          <p className="mt-2 text-gray-600">
            Here's what's happening with your invoicing today.
          </p>
        </div>

        {/* Quick Stats - placeholder for now */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Total Invoices</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
            <p className="mt-1 text-sm text-gray-400">All time</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Pending Payments</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">$0.00</p>
            <p className="mt-1 text-sm text-gray-400">Awaiting payment</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <p className="mt-2 text-3xl font-bold text-green-600">$0.00</p>
            <p className="mt-1 text-sm text-gray-400">This month</p>
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Get Started
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Profile */}
            <div className="border border-gray-200 rounded-lg p-5">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold mb-4">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Set Up Your Profile</h3>
              <p className="text-sm text-gray-600 mb-4">
                Add your business info, logo, and service regions.
              </p>
              <Link 
                href="/profile" 
                className="text-sm font-medium text-brand hover:underline"
              >
                Complete profile
              </Link>
            </div>

            {/* Step 2: Clients */}
            <div className="border border-gray-200 rounded-lg p-5">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-semibold mb-4">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Add Your Clients</h3>
              <p className="text-sm text-gray-600 mb-4">
                Import or add the customers you'll be invoicing.
              </p>
              <Link 
                href="/clients" 
                className="text-sm font-medium text-gray-400 hover:text-brand"
              >
                Add clients
              </Link>
            </div>

            {/* Step 3: Invoice */}
            <div className="border border-gray-200 rounded-lg p-5">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-semibold mb-4">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Create Your First Invoice</h3>
              <p className="text-sm text-gray-600 mb-4">
                Send a professional invoice and get paid faster.
              </p>
              <Link 
                href="/invoices" 
                className="text-sm font-medium text-gray-400 hover:text-brand"
              >
                Create invoice
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity - empty state for now */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="text-center py-10">
            <p className="text-gray-500">No recent activity yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Your invoices and payments will show up here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

