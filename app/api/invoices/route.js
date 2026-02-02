/*
  Invoices API - Server-Side Pagination
  --------------------------------------
  Efficient paginated endpoint for fetching invoices.
  
  Benefits over client-side fetching:
  - Only transfers the data needed for the current page
  - Filtering and sorting happens at the database level
  - Scales to thousands of invoices without performance issues
  
  Query Parameters:
  - page: Page number (default: 1)
  - limit: Items per page (default: 15, max: 100)
  - sort: Field to sort by (default: created_at)
  - order: Sort order - asc or desc (default: desc)
  - type: Document type filter - all, invoice, estimate (default: all)
  - search: Search term for invoice number or client name
  - status: Filter by status (optional)
  
  Example:
  GET /api/invoices?page=1&limit=15&sort=created_at&order=desc&type=invoice
*/

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, apiError } from "@/lib/api/middleware";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


// Allowed sort fields to prevent SQL injection via sort parameter
const ALLOWED_SORT_FIELDS = [
  "created_at",
  "invoice_number",
  "issue_date",
  "due_date",
  "total",
  "status",
];

export async function GET(request) {
  try {
    // Rate limiting - 100 requests per minute per IP
    const rateLimit = checkRateLimit(request, { limit: 100 });
    if (!rateLimit.allowed) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    // Get the authenticated user from the session cookie
    // For this endpoint, we'll verify via the auth header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return apiError("Unauthorized", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return apiError("Unauthorized", 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const sort = searchParams.get("sort") || "created_at";
    const order = searchParams.get("order") === "asc" ? true : false;
    const type = searchParams.get("type") || "all";
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const status = searchParams.get("status") || "";

    // Validate sort field
    if (!ALLOWED_SORT_FIELDS.includes(sort)) {
      return apiError(`Invalid sort field. Allowed: ${ALLOWED_SORT_FIELDS.join(", ")}`, 400);
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build the base query
    let query = supabaseAdmin
      .from("invoices")
      .select(`
        id,
        invoice_number,
        issue_date,
        due_date,
        total,
        status,
        document_type,
        notes,
        created_at,
        clients:client_id (
          id,
          name,
          email
        )
      `, { count: "exact" })
      .eq("owner_id", user.id);

    // Apply document type filter
    if (type === "invoice") {
      query = query.or("document_type.eq.invoice,document_type.is.null");
    } else if (type === "estimate") {
      query = query.eq("document_type", "estimate");
    }

    // Apply status filter
    if (status) {
      query = query.eq("status", status);
    }

    // Apply search filter
    // Note: For complex searches, consider using Supabase full-text search
    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%`);
    }

    // Apply sorting and pagination
    query = query
      .order(sort, { ascending: order })
      .range(offset, offset + limit - 1);

    // Execute the query
    const { data: invoices, error: queryError, count } = await query;

    if (queryError) {
      console.error("Error fetching invoices:", queryError);
      return apiError("Failed to fetch invoices", 500);
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      data: invoices || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages,
      },
    });

  } catch (error) {
    console.error("Invoices API error:", error);
    return apiError("Internal server error", 500);
  }
}







