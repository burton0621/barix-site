/*
  API Middleware Utilities
  ------------------------
  Reusable utilities for API route handlers including:
  - Rate limiting (in-memory for now, Redis in production)
  - Request validation
  - Error response helpers
  
  Import like: import { withRateLimit, apiError } from "@/lib/api/middleware";
*/

import { NextResponse } from "next/server";

/*
  In-memory rate limiting store
  For production, you'd want to use Redis or a similar distributed cache.
  This works well for single-instance deployments and development.
*/
const rateLimitStore = new Map();

// Clean up old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupRateLimitStore() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  const cutoff = now - 60000; // Remove entries older than 1 minute

  for (const [key, data] of rateLimitStore.entries()) {
    if (data.windowStart < cutoff) {
      rateLimitStore.delete(key);
    }
  }
}

/*
  Rate Limiter
  ------------
  Limits requests per IP address within a time window.
  
  Options:
  - limit: Number of requests allowed (default: 100)
  - windowMs: Time window in milliseconds (default: 60000 = 1 minute)
  
  Usage in API route:
  
  import { checkRateLimit, apiError } from "@/lib/api/middleware";
  
  export async function POST(request) {
    const rateLimitResult = checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return apiError("Too many requests", 429);
    }
    // ... rest of handler
  }
*/
export function checkRateLimit(request, options = {}) {
  const { limit = 100, windowMs = 60000 } = options;

  // Get client IP from headers (works with Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  
  // For webhooks, use a more generous limit
  const isWebhook = request.headers.get("stripe-signature");
  const effectiveLimit = isWebhook ? limit * 10 : limit;

  const now = Date.now();
  cleanupRateLimitStore();

  const key = ip;
  const stored = rateLimitStore.get(key);

  if (!stored || now - stored.windowStart > windowMs) {
    // Start a new window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: effectiveLimit - 1 };
  }

  // Increment count in current window
  stored.count++;
  
  if (stored.count > effectiveLimit) {
    return { 
      allowed: false, 
      remaining: 0,
      retryAfter: Math.ceil((stored.windowStart + windowMs - now) / 1000),
    };
  }

  return { allowed: true, remaining: effectiveLimit - stored.count };
}

/*
  API Error Response Helper
  -------------------------
  Creates a standardized error response.
  
  Usage:
  return apiError("Something went wrong", 500);
  return apiError("Not found", 404);
  return apiError("Validation failed", 400, { field: "email", message: "Invalid email" });
*/
export function apiError(message, status = 500, details = null) {
  const body = { error: message };
  if (details) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

/*
  API Success Response Helper
  ---------------------------
  Creates a standardized success response.
  
  Usage:
  return apiSuccess({ user: userData });
  return apiSuccess({ message: "Created" }, 201);
*/
export function apiSuccess(data, status = 200) {
  return NextResponse.json(data, { status });
}

/*
  Request Body Parser
  -------------------
  Safely parses JSON request body with error handling.
  
  Usage:
  const { data, error } = await parseBody(request);
  if (error) {
    return apiError("Invalid JSON body", 400);
  }
*/
export async function parseBody(request) {
  try {
    const data = await request.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/*
  Required Fields Validator
  -------------------------
  Checks that required fields are present in the request body.
  
  Usage:
  const { data } = await parseBody(request);
  const missing = validateRequired(data, ["email", "password"]);
  if (missing.length > 0) {
    return apiError(`Missing required fields: ${missing.join(", ")}`, 400);
  }
*/
export function validateRequired(data, fields) {
  if (!data || typeof data !== "object") {
    return fields;
  }

  return fields.filter((field) => {
    const value = data[field];
    return value === undefined || value === null || value === "";
  });
}





