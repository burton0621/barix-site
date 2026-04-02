import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { exchangeCodeForTokens, getCalendarClient } from "@/lib/google/calendarClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(request.url).origin
    : "http://localhost:3000";

  // User denied access
  if (errorParam) {
    return NextResponse.redirect(`${baseUrl}/calendar?error=google_denied`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${baseUrl}/calendar?error=invalid_callback`);
  }

  try {
    // Verify state cookie matches to prevent CSRF
    const cookieState = request.cookies.get("google_oauth_state")?.value;
    if (!cookieState || cookieState !== stateParam) {
      return NextResponse.redirect(`${baseUrl}/calendar?error=state_mismatch`);
    }

    // Decode and verify HMAC signature
    const decoded = Buffer.from(stateParam, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) {
      return NextResponse.redirect(`${baseUrl}/calendar?error=invalid_state`);
    }

    const [userId, timestamp, receivedHmac] = parts;

    // Check state is not older than 10 minutes
    if (Date.now() - parseInt(timestamp, 10) > 600_000) {
      return NextResponse.redirect(`${baseUrl}/calendar?error=state_expired`);
    }

    // Verify HMAC
    const payload = `${userId}:${timestamp}`;
    const expectedHmac = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
      .update(payload)
      .digest("hex");

    if (receivedHmac !== expectedHmac) {
      return NextResponse.redirect(`${baseUrl}/calendar?error=invalid_state`);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch the Google account email for display
    let googleEmail = null;
    try {
      const calendar = getCalendarClient(tokens);
      const calListRes = await calendar.calendarList.get({ calendarId: "primary" });
      googleEmail = calListRes.data.id; // primary calendar id is the user's email
    } catch {
      // Non-fatal - just won't show email
    }

    // Upsert tokens into Supabase
    const { error: upsertError } = await supabaseAdmin
      .from("google_calendar_tokens")
      .upsert(
        {
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_type: tokens.token_type || "Bearer",
          scope: tokens.scope || null,
          expiry_date: tokens.expiry_date || null,
          google_email: googleEmail,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Failed to store Google tokens:", upsertError);
      return NextResponse.redirect(`${baseUrl}/calendar?error=token_save_failed`);
    }

    // Clear the state cookie and redirect to calendar page
    const response = NextResponse.redirect(`${baseUrl}/calendar?connected=true`);
    response.cookies.set("google_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${baseUrl}/calendar?error=oauth_failed`);
  }
}
