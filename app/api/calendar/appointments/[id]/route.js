import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, apiError, parseBody } from "@/lib/api/middleware";
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

async function syncTokenIfRefreshed(userId, result) {
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

// PATCH /api/calendar/appointments/[id]
export async function PATCH(request, { params }) {
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

    const { id } = params;

    // Fetch existing appointment and verify it belongs to this team
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select("*")
      .eq("id", id)
      .eq("contractor_id", contractorId)
      .single();

    if (fetchError || !existing) return apiError("Appointment not found", 404);

    const { data: body, error: parseError } = await parseBody(request);
    if (parseError) return apiError("Invalid request body", 400);

    const updateFields = {};
    if (body.title !== undefined) updateFields.title = body.title.trim();
    if (body.description !== undefined) updateFields.description = body.description?.trim() || null;
    if (body.type !== undefined) updateFields.type = body.type;
    if (body.client_id !== undefined) updateFields.client_id = body.client_id || null;
    if (body.location !== undefined) updateFields.location = body.location?.trim() || null;
    if (body.start_time !== undefined) updateFields.start_time = body.start_time;
    if (body.end_time !== undefined) updateFields.end_time = body.end_time;
    if (body.all_day !== undefined) updateFields.all_day = body.all_day;
    if (body.invoice_id !== undefined) updateFields.invoice_id = body.invoice_id || null;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("appointments")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating appointment:", updateError);
      return apiError("Failed to update appointment", 500);
    }

    // Sync to Google Calendar if event was previously synced
    if (existing.google_event_id) {
      const tokenRow = await getGoogleTokenRow(user.id);
      if (tokenRow) {
        try {
          const result = await getValidTokens(tokenRow);
          await syncTokenIfRefreshed(user.id, result);

          const calendar = getCalendarClient(result.tokens);
          const patchData = {};
          if (updateFields.title) patchData.summary = updateFields.title;
          if (updateFields.description !== undefined) patchData.description = updateFields.description || "";
          if (updateFields.location !== undefined) patchData.location = updateFields.location || "";

          if (updateFields.start_time || updateFields.end_time || updateFields.all_day !== undefined) {
            const start = updated.start_time;
            const end = updated.end_time;
            if (updated.all_day) {
              patchData.start = { date: start.split("T")[0] };
              patchData.end = { date: end.split("T")[0] };
            } else {
              patchData.start = { dateTime: start };
              patchData.end = { dateTime: end };
            }
          }

          await calendar.events.patch({
            calendarId: "primary",
            eventId: existing.google_event_id,
            requestBody: patchData,
          });

          await supabaseAdmin
            .from("appointments")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("id", id);
        } catch (gcalError) {
          console.error("Google Calendar patch failed (non-fatal):", gcalError);
        }
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH appointment error:", error);
    return apiError("Internal server error", 500);
  }
}

// DELETE /api/calendar/appointments/[id]
export async function DELETE(request, { params }) {
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

    const { id } = params;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select("google_event_id")
      .eq("id", id)
      .eq("contractor_id", contractorId)
      .single();

    if (fetchError || !existing) return apiError("Appointment not found", 404);

    const { error: deleteError } = await supabaseAdmin
      .from("appointments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting appointment:", deleteError);
      return apiError("Failed to delete appointment", 500);
    }

    // Remove from Google Calendar if synced
    if (existing.google_event_id) {
      const tokenRow = await getGoogleTokenRow(user.id);
      if (tokenRow) {
        try {
          const result = await getValidTokens(tokenRow);
          await syncTokenIfRefreshed(user.id, result);

          const calendar = getCalendarClient(result.tokens);
          await calendar.events.delete({
            calendarId: "primary",
            eventId: existing.google_event_id,
          });
        } catch (gcalError) {
          console.error("Google Calendar delete failed (non-fatal):", gcalError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE appointment error:", error);
    return apiError("Internal server error", 500);
  }
}
