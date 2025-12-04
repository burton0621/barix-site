"use client";

/*
  Clients Page
  ------------
  This page will list all clients/customers and allow users to add new ones.
  Clients are the people or businesses that contractors send invoices to.
  
  For now, it's a placeholder showing an empty state.
  
  Future features:
  - Client list with search
  - Client details (contact info, address, payment history)
  - Quick actions (send invoice, view history)
  - Import from contacts or CSV
*/

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import DashboardNavbar from "@/components/Navbar/DashboardNavbar";

export default function ClientsPage() {
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
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="mt-1 text-gray-600">
              Manage your customers and their information
            </p>
          </div>
          <button 
            className="px-5 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors"
            onClick={() => alert("Add client coming soon!")}
          >
            Add Client
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No clients yet
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Add your first client to start sending invoices. You can add them manually or import from a file.
          </p>
          <button 
            className="px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors"
            onClick={() => alert("Add client coming soon!")}
          >
            Add Your First Client
          </button>
        </div>
      </main>
    </div>
  );
}

