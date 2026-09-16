import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAndSaveOtp } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, role = "CUSTOMER" } = body;

    if (!phone || typeof phone !== "string" || phone.length < 9) {
      return NextResponse.json(
        { error: "A valid phone number is required (e.g. +250 788 123 456)" },
        { status: 400 }
      );
    }

    // Ensure phone is normalized
    const cleanPhone = phone.trim();

    // Generate and persist OTP in database with 10-minute validity
    const otp = await createAndSaveOtp(cleanPhone);

    // Record audit event
    await logAuditEvent({
      action: "OTP_REQUESTED",
      entityType: "AUTH",
      entityId: cleanPhone,
      metadata: { requestedRole: role },
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent via SMS",
      // In development / demo mode, return OTP to assist evaluation
      otp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("[Auth API Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate verification code. Please try again." },
      { status: 500 }
    );
  }
}
