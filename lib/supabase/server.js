/*
  Supabase Server Client (Admin)
  ------------------------------
  Use this client in API routes and server-side operations.
  
  It uses the service role key which BYPASSES Row Level Security.
  Only use this when you need admin-level access to the database.
  
  IMPORTANT: Never expose this to the client or import in React components!
  
  Import like: import { supabaseAdmin } from "@/lib/supabase/server";
*/

import { createClient } from "@supabase/supabase-js";

// Create admin client with service role key
// This client has full database access and bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // Don't persist sessions on server - each request is stateless
      persistSession: false,
      // Don't auto-refresh on server
      autoRefreshToken: false,
    },
  }
);

export { supabaseAdmin };

/*
  Helper: Get authenticated user from request
  -------------------------------------------
  Use this in API routes to verify the request is from an authenticated user.
  Returns the user object or null if not authenticated.
  
  Example usage in an API route:
  
  import { getAuthenticatedUser } from "@/lib/supabase/server";
  
  export async function POST(request) {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ... rest of your handler
  }
*/
export async function getAuthenticatedUser(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}





