/*
  Decline Estimate API
  --------------------
  When a client declines an estimate, we simply update the status to "declined".
  This allows the business owner to see that the estimate was rejected and
  potentially follow up with the client.
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  const { estimateId } = await params;

  if (!estimateId) {
    return NextResponse.json(
      { error: "Estimate ID is required" },
      { status: 400 }
    );
  }

  try {
    // First, fetch the estimate to make sure it exists and hasn't been processed
    const { data: estimate, error: fetchError } = await supabaseAdmin
      .from("invoices")
      .select("id, document_type, status")
      .eq("id", estimateId)
      .single();

    if (fetchError || !estimate) {
      console.error("Error fetching estimate:", fetchError);
      return NextResponse.json(
        { error: "Estimate not found" },
        { status: 404 }
      );
    }

    // Check if this is actually an estimate
    if (estimate.document_type !== "estimate") {
      return NextResponse.json(
        { error: "This document is not an estimate" },
        { status: 400 }
      );
    }

    // Check if the estimate has already been processed
    if (estimate.status === "accepted") {
      return NextResponse.json(
        { error: "This estimate has already been accepted" },
        { status: 400 }
      );
    }

    if (estimate.status === "declined") {
      return NextResponse.json(
        { error: "This estimate has already been declined" },
        { status: 400 }
      );
    }

    // Update the estimate status to "declined"
    const { error: updateError } = await supabaseAdmin
      .from("invoices")
      .update({
        status: "declined",
      })
      .eq("id", estimateId);

    if (updateError) {
      console.error("Error updating estimate status:", updateError);
      return NextResponse.json(
        { error: "Failed to decline estimate" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Estimate declined",
    });
  } catch (error) {
    console.error("Unexpected error in decline estimate API:", error);
    return NextResponse.json(
      { error: "Failed to decline estimate" },
      { status: 500 }
    );
  }
}



