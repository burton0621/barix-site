import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google/calendarClient";
import { checkRateLimit, apiError } from "@/lib/api/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const rateLimit = checkRateLimit(request, { limit: 20 });
    if (!rateLimit.allowed) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    // Expect the Supabase JWT as a query param since this is a browser redirect
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return apiError("Missing token", 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return apiError("Unauthorized", 401);
    }

    // Build a CSRF-safe state: userId:timestamp:hmac
    const timestamp = Date.now().toString();
    const payload = `${user.id}:${timestamp}`;
    const hmac = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
      .update(payload)
      .digest("hex");
    const state = Buffer.from(`${payload}:${hmac}`).toString("base64url");

    const authUrl = getAuthUrl(state);

    const response = NextResponse.redirect(authUrl);

    // Store state in a short-lived cookie for CSRF validation in the callback
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Google OAuth initiate error:", error);
    return apiError("Failed to initiate Google OAuth", 500);
  }
}
