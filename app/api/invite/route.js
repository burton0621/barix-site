/*
  Team Invitation API Route
  -------------------------
  This API endpoint handles inviting new team members.
  
  Flow:
  1. Receives invite details (email, name, password, role, contractor_id)
  2. Verifies the requester is an admin for that company
  3. Creates a Supabase Auth user with the admin-provided password
     (or updates the password if user already exists)
  4. Creates a team_members record linking them to the company
  5. Sends an invitation email via Resend
  
  The invited user can immediately log in with their email and the
  password set by the admin. They can change it later in Settings.
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Create Supabase client with service role for admin operations
// This allows us to create users and bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Parse the request body
    const { email, name, password, role, contractorId, invitedBy, companyName } = await request.json();

    // Validate required fields
    if (!email || !password || !contractorId || !invitedBy) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, contractorId, invitedBy" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Verify the inviter is an admin for this company
    const { data: inviterMembership, error: membershipError } = await supabaseAdmin
      .from("team_members")
      .select("role")
      .eq("user_id", invitedBy)
      .eq("contractor_id", contractorId)
      .single();

    if (membershipError || !inviterMembership || inviterMembership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can invite team members" },
        { status: 403 }
      );
    }

    // Check if email is already invited to this company
    const { data: existingMember } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("contractor_id", contractorId)
      .ilike("email", email)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "This email has already been invited to your team" },
        { status: 400 }
      );
    }

    // Check if user already exists in Supabase Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId;
    let isNewUser = false;

    if (existingUser) {
      // User already has an account - update their password to the admin-set one
      // This ensures the password the admin set will work for login
      userId = existingUser.id;
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password
      });

      if (updateError) {
        console.error("Error updating user password:", updateError);
        return NextResponse.json(
          { error: "Failed to update user password: " + updateError.message },
          { status: 500 }
        );
      }
      
      console.log("Updated password for existing user:", email);
    } else {
      // Create a new Supabase Auth user with the admin-provided password
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true  // Auto-confirm email so they can log in immediately
      });

      if (createUserError) {
        console.error("Error creating user:", createUserError);
        return NextResponse.json(
          { error: "Failed to create user account: " + createUserError.message },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log("Created new user:", email);
    }

    // Create the team_members record linking user to company
    const { data: membership, error: insertError } = await supabaseAdmin
      .from("team_members")
      .insert({
        user_id: userId,
        contractor_id: contractorId,
        email: email.toLowerCase(),
        name: name || null,
        role: role || "user",
        invited_by: invitedBy,
        accepted_at: new Date().toISOString()  // Already accepted since account is created
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating team membership:", insertError);
      return NextResponse.json(
        { error: "Failed to create team membership: " + insertError.message },
        { status: 500 }
      );
    }

    // Build the login URL
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.barixbilling.com/"}/login`;

    // Send the invitation email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Barix Billing <onboarding@resend.dev>",
      to: email,
      subject: `You've been added to ${companyName || "a team"} on Barix Billing`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0a2540, #194d7a); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to the Team!</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-top: 0;">Hi${name ? ` ${name}` : ""},</p>
            
            <p style="font-size: 16px;">
              You've been added to <strong>${companyName || "a team"}</strong> on Barix Billing as a <strong>${role || "team member"}</strong>.
            </p>
            
            <p style="font-size: 16px;">
              Your account is ready! Use the credentials below to log in:
            </p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0; font-size: 14px;"><strong>Temporary Password:</strong> ${password}</p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              We recommend changing your password after your first login.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #0a2540, #194d7a); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Log In Now
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 13px; color: #9ca3af; margin-bottom: 0;">
              This invitation was sent by ${companyName || "a Barix Billing user"}. 
              If you didn't expect this email, you can safely ignore it.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">Barix Billing - We Bill, You Build</p>
          </div>
        </body>
        </html>
      `
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      // Still return success since the account was created
      // Admin can share credentials manually
      return NextResponse.json({
        success: true,
        membership,
        emailSent: false,
        emailError: emailError.message,
        isNewUser
      });
    }

    return NextResponse.json({
      success: true,
      membership,
      emailSent: true,
      emailId: emailData?.id,
      isNewUser
    });

  } catch (error) {
    console.error("Invitation API error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
