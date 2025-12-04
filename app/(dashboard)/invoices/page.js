"use client";

/*
  Invoices Page
  -------------
  This page will list all invoices and allow users to create new ones.
  For now, it's a placeholder showing an empty state with a CTA
  to create the first invoice.
  
  Future features:
  - Invoice list with status filters (draft, sent, paid, overdue)
  - Search and sort functionality
  - Quick actions (send reminder, mark as paid, duplicate)
*/

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";

export default function InvoicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  /*
    Protect this route - only logged in users can access
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
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="mt-1 text-gray-600">
              Create and manage your invoices
            </p>
          </div>
          <button 
            className="px-5 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors"
            onClick={() => alert("Invoice creation coming soon!")}
          >
            Create Invoice
          </button>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg 
              className="w-8 h-8 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No invoices yet
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create your first invoice to start getting paid. It only takes a minute.
          </p>
          <button 
            className="px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors"
            onClick={() => alert("Invoice creation coming soon!")}
          >
            Create Your First Invoice
          </button>
        </div>
      </main>
    </div>
  );
}

