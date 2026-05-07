import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, apiError, parseBody, validateRequired } from "@/lib/api/middleware";
import { getCalendarClient, getValidTokens } from "@/lib/google/calendarClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getContractorId(userId) {
  const { data, error } = await supabaseAdmin
    .from("team_members")
    .select("contractor_id")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data.contractor_id;
}

async function getGoogleTokenRow(userId) {
  const { data } = await supabaseAdmin
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data || null;
}

async function syncTokenIfRefreshed(userId, tokenRow, result) {
  if (result.refreshed) {
    await supabaseAdmin
      .from("google_calendar_tokens")
      .update({
        access_token: result.tokens.access_token,
        expiry_date: result.newExpiry,
      })
      .eq("user_id", userId);
  }
}

// GET /api/calendar/appointments?from=ISO&to=ISO
export async function GET(request) {
  try {
    const rateLimit = checkRateLimit(request, { limit: 100 });
    if (!rateLimit.allowed) return apiError("Too many requests.", 429);

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return apiError("Unauthorized", 401);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return apiError("Unauthorized", 401);

    const contractorId = await getContractorId(user.id);
    if (!contractorId) return apiError("Team membership not found", 403);

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) return apiError("Missing from/to query params", 400);

    const { data: appointments, error: queryError } = await supabaseAdmin
      .from("appointments")
      .select(`
        id, type, title, description, location, start_time, end_time, all_day,
        google_event_id, created_by, created_at,
        clients:client_id ( id, name, email )
      `)
      .eq("contractor_id", contractorId)
      .gte("start_time", from)
      .lte("start_time", to)
      .order("start_time", { ascending: true });

    if (queryError) {
      console.error("Error fetching appointments:", queryError);
      return apiError("Failed to fetch appointments", 500);
    }

    return NextResponse.json({ success: true, data: appointments || [] });
  } catch (error) {
    console.error("GET appointments error:", error);
    return apiError("Internal server error", 500);
  }
}

// POST /api/calendar/appointments
export async function POST(request) {
  try {
    const rateLimit = checkRateLimit(request, { limit: 60 });
    if (!rateLimit.allowed) return apiError("Too many requests.", 429);

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return apiError("Unauthorized", 401);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return apiError("Unauthorized", 401);

    const contractorId = await getContractorId(user.id);
    if (!contractorId) return apiError("Team membership not found", 403);

    const { data: body, error: parseError } = await parseBody(request);
    if (parseError) return apiError("Invalid request body", 400);

    const missing = validateRequired(body, ["title", "start_time", "end_time", "type"]);
    if (missing.length > 0) {
      return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
    }

    const validTypes = ["client_meeting", "job_site_visit", "general", "invoice_due"];
    if (!validTypes.includes(body.type)) {
      return apiError("Invalid appointment type", 400);
    }

    const { data: appointment, error: insertError } = await supabaseAdmin
      .from("appointments")
      .insert({
        contractor_id: contractorId,
        created_by: user.id,
        type: body.type,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        client_id: body.client_id || null,
        location: body.location?.trim() || null,
        start_time: body.start_time,
        end_time: body.end_time,
        all_day: body.all_day || false,
        invoice_id: body.invoice_id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating appointment:", insertError);
      return apiError("Failed to create appointment", 500);
    }

    // Push to Google Calendar if user has connected their account
    const tokenRow = await getGoogleTokenRow(user.id);
    if (tokenRow) {
      try {
        const result = await getValidTokens(tokenRow);
        await syncTokenIfRefreshed(user.id, tokenRow, result);

        const calendar = getCalendarClient(result.tokens);
        const event = {
          summary: appointment.title,
          description: appointment.description || undefined,
          location: appointment.location || undefined,
        };

        if (appointment.all_day) {
          const dateStr = appointment.start_time.split("T")[0];
          const endDateStr = appointment.end_time.split("T")[0];
          event.start = { date: dateStr };
          event.end = { date: endDateStr };
        } else {
          event.start = { dateTime: appointment.start_time };
          event.end = { dateTime: appointment.end_time };
        }

        const gcalRes = await calendar.events.insert({
          calendarId: "primary",
          requestBody: event,
        });

        // Store the google_event_id back on the appointment
        await supabaseAdmin
          .from("appointments")
          .update({
            google_event_id: gcalRes.data.id,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", appointment.id);

        appointment.google_event_id = gcalRes.data.id;
      } catch (gcalError) {
        console.error("Google Calendar push failed (non-fatal):", gcalError);
      }
    }

    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (error) {
    console.error("POST appointment error:", error);
    return apiError("Internal server error", 500);
  }
}
