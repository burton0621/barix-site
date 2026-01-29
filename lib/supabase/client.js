/*
  Supabase Browser Client
  -----------------------
  Use this client in React components (client-side).
  
  It uses the public anon key which respects Row Level Security (RLS).
  This means users can only access data they're allowed to see based
  on the RLS policies defined in Supabase.
  
  Import like: import { supabase } from "@/lib/supabase/client";
*/

import { createClient } from "@supabase/supabase-js";

// Singleton pattern - create client once and reuse
// This prevents creating multiple GoTrue clients which causes memory leaks
let supabaseInstance = null;

export function getSupabaseBrowserClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY,
    {
      auth: {
        // Persist session in localStorage for better UX
        persistSession: true,
        // Automatically refresh tokens before they expire
        autoRefreshToken: true,
      },
    }
  );

  return supabaseInstance;
}

// Export a default instance for convenience
// Most components just need to import { supabase } from "@/lib/supabase/client"
export const supabase = getSupabaseBrowserClient();





