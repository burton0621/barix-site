/*
  Formatting Utilities
  --------------------
  Reusable formatting functions for dates, currency, and other common patterns.
  
  These are used throughout the app to ensure consistent formatting and 
  avoid duplicating the same logic in multiple components.
  
  Import like: import { formatCurrency, formatDate } from "@/lib/utils/formatters";
*/

/*
  Format a value as US currency
  Returns a string like "$1,234.56"
*/
export function formatCurrency(value, options = {}) {
  const num = Number(value ?? 0);
  const { showCents = true, locale = "en-US" } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(num);
}

/*
  Format a date for display
  Handles multiple input formats:
  - Date objects
  - ISO strings (2024-01-15T00:00:00Z)
  - Date-only strings from Supabase (2024-01-15)
  
  Returns a localized string like "Jan 15, 2024"
*/
export function formatDate(value, options = {}) {
  if (!value) return "—";

  const {
    locale = undefined, // Use browser default
    style = "medium",   // "short", "medium", "long", "full"
  } = options;

  // Style presets for common formats
  const stylePresets = {
    short: { month: "numeric", day: "numeric", year: "2-digit" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { month: "long", day: "numeric", year: "numeric" },
    full: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  };

  const formatOptions = stylePresets[style] || stylePresets.medium;

  // Handle Date objects
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "—";
    return value.toLocaleDateString(locale, formatOptions);
  }

  // Handle YYYY-MM-DD format from Supabase date columns
  // We parse this manually to avoid timezone issues
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map((v) => parseInt(v, 10));
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(locale, formatOptions);
  }

  // Handle ISO strings and other formats
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(locale, formatOptions);
}

/*
  Format a date with time
  Returns a string like "Jan 15, 2024 at 3:30 PM"
*/
export function formatDateTime(value, options = {}) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const { locale = undefined } = options;

  return date.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/*
  Format a relative time (e.g., "2 hours ago", "in 3 days")
  Good for showing when invoices are due or when they were paid
*/
export function formatRelativeTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Use Intl.RelativeTimeFormat if available (modern browsers)
  if (typeof Intl !== "undefined" && Intl.RelativeTimeFormat) {
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (Math.abs(diffDays) < 1) {
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      if (Math.abs(diffHours) < 1) {
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        return rtf.format(diffMinutes, "minute");
      }
      return rtf.format(diffHours, "hour");
    }

    if (Math.abs(diffDays) < 30) {
      return rtf.format(diffDays, "day");
    }

    const diffMonths = Math.round(diffDays / 30);
    return rtf.format(diffMonths, "month");
  }

  // Fallback for older browsers
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}

/*
  Format a phone number
  Input: "1234567890" or "(123) 456-7890" or "123-456-7890"
  Output: "(123) 456-7890"
*/
export function formatPhoneNumber(value) {
  if (!value) return "";

  // Remove all non-digits
  const digits = String(value).replace(/\D/g, "");

  // Handle 10-digit US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Handle 11-digit US numbers with country code
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if we can't format it
  return value;
}

/*
  Truncate text with ellipsis
  Useful for displaying long names or descriptions in tables
*/
export function truncateText(text, maxLength = 50) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}


