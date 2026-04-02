import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, apiError } from "@/lib/api/middleware";
import { getCalendarClient, getValidTokens } from "@/lib/google/calendarClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const rateLimit = checkRateLimit(request, { limit: 20 });
    if (!rateLimit.allowed) return apiError("Too many requests.", 429);

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return apiError("Unauthorized", 401);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return apiError("Unauthorized", 401);

    // Get user's contractor ID
    const { data: membership } = await supabaseAdmin
      .from("team_members")
      .select("contractor_id")
      .eq("user_id", user.id)
      .single();

    if (!membership) return apiError("Team membership not found", 403);
    const contractorId = membership.contractor_id;

    // Get Google token
    const { data: tokenRow } = await supabaseAdmin
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ success: false, message: "Google Calendar not connected" });
    }

    const result = await getValidTokens(tokenRow);

    // Persist refreshed token if needed
    if (result.refreshed) {
      await supabaseAdmin
        .from("google_calendar_tokens")
        .update({
          access_token: result.tokens.access_token,
          expiry_date: result.newExpiry,
        })
        .eq("user_id", user.id);
    }

    const calendar = getCalendarClient(result.tokens);

    // Sync 3 months back and 6 months forward
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 3);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 6);

    const gcalRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 500,
    });

    const events = gcalRes.data.items || [];
    let synced = 0;
    let deleted = 0;

    for (const event of events) {
      if (!event.id) continue;

      // Handle cancelled events
      if (event.status === "cancelled") {
        const { error: delErr } = await supabaseAdmin
          .from("appointments")
          .delete()
          .eq("google_event_id", event.id)
          .eq("contractor_id", contractorId);
        if (!delErr) deleted++;
        continue;
      }

      const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
      const startTime = isAllDay
        ? new Date(event.start.date + "T00:00:00").toISOString()
        : event.start.dateTime;
      const endTime = isAllDay
        ? new Date(event.end.date + "T00:00:00").toISOString()
        : event.end.dateTime;

      if (!startTime || !endTime) continue;

      // Check if this event already exists in our DB
      const { data: existing } = await supabaseAdmin
        .from("appointments")
        .select("id")
        .eq("google_event_id", event.id)
        .eq("contractor_id", contractorId)
        .single();

      if (existing) {
        // Update existing
        await supabaseAdmin
          .from("appointments")
          .update({
            title: event.summary || "(No title)",
            description: event.description || null,
            location: event.location || null,
            start_time: startTime,
            end_time: endTime,
            all_day: isAllDay,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        // Insert new
        await supabaseAdmin.from("appointments").insert({
          contractor_id: contractorId,
          created_by: user.id,
          type: "general",
          title: event.summary || "(No title)",
          description: event.description || null,
          location: event.location || null,
          start_time: startTime,
          end_time: endTime,
          all_day: isAllDay,
          google_event_id: event.id,
          google_calendar_id: "primary",
          last_synced_at: new Date().toISOString(),
        });
      }
      synced++;
    }

    // Update last_synced_at on the token row
    await supabaseAdmin
      .from("google_calendar_tokens")
      .update({ updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, synced, deleted });
  } catch (error) {
    console.error("Sync error:", error);
    return apiError("Sync failed", 500);
  }
}
