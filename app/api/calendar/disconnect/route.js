import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, apiError } from "@/lib/api/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const rateLimit = checkRateLimit(request, { limit: 20 });
    if (!rateLimit.allowed) {
      return apiError("Too many requests.", 429);
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return apiError("Unauthorized", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return apiError("Unauthorized", 401);
    }

    const { error } = await supabaseAdmin
      .from("google_calendar_tokens")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to disconnect Google Calendar:", error);
      return apiError("Failed to disconnect", 500);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect error:", error);
    return apiError("Internal server error", 500);
  }
}
