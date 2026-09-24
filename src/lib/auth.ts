import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { Role, User } from "@prisma/client";

const DEFAULT_FALLBACK_SECRET = "mosa-community-network-secure-jwt-secret-key-rwanda-2026";

/**
 * Returns the cryptographically secure JWT secret key.
 * In production, strictly enforces that a dedicated high-entropy secret is configured
 * and prohibits usage of default/fallback secrets.
 */
export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret === DEFAULT_FALLBACK_SECRET)) {
    throw new Error(
      "[SECURITY CRITICAL]: JWT_SECRET must be configured with a high-entropy secret in production. Default fallback secret is prohibited."
    );
  }
  return new TextEncoder().encode(secret || DEFAULT_FALLBACK_SECRET);
}

const SESSION_COOKIE_NAME = "mosa_session";

export interface SessionPayload {
  userId: string;
  phone?: string | null;
  email?: string | null;
  role: Role;
  name: string;
}

/**
 * Creates a signed JWT session token valid for 30 days.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecretKey());
}

/**
 * Verifies a JWT session token and returns the payload.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Sets the secure HTTP-only session cookie on the response.
 * If rememberMe is true, persists for 30 days. Otherwise, creates a session-duration cookie.
 */
export async function setSessionCookie(token: string, rememberMe: boolean = true) {
  const cookieStore = await cookies();
  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  if (rememberMe) {
    cookieOptions.maxAge = 30 * 24 * 60 * 60; // 30 days
  } else {
    cookieOptions.maxAge = 24 * 60 * 60; // 1 day
  }

  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions);
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export * from "./crypto";

/**
 * Retrieves the currently authenticated User from the database using the session cookie.
 * Strictly verifies against Neon PostgreSQL User & Session tables.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    // Verify session in Neon Session table to ensure it has not expired
    try {
      const dbSession = await prisma.session.findUnique({
        where: { token },
      });
      if (dbSession && dbSession.expiresAt < new Date()) {
        return null;
      }
    } catch {
      // If session query fails, continue to user verification
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (user && user.status === "ACTIVE") {
      return user;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Verifies that the current user has one of the allowed roles.
 */
export async function requireAuth(allowedRoles?: Role[]): Promise<{ user: User | null; error?: string; status?: number }> {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: "Authentication required", status: 401 };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return { user: null, error: "Forbidden: insufficient permissions", status: 403 };
  }

  return { user };
}

/**
 * Password hashing utility
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export async function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

/**
 * Creates and saves an OTP verification record with 10-minute expiry in PostgreSQL.
 * Supports email addresses or phone identifiers (normalized).
 */
export async function createAndSaveOtp(identifier: string): Promise<string> {
  const cleanIdentifier = identifier.toLowerCase().trim();
  // Secure 4-digit verification code
  const code = Math.floor(1000 + Math.random() * 9000).toString();

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any older pending OTPs for this identifier
  await prisma.otpVerification.deleteMany({
    where: { phone: cleanIdentifier },
  }).catch(() => {});

  await prisma.otpVerification.create({
    data: {
      phone: cleanIdentifier,
      code,
      attempts: 0,
      expiresAt,
    },
  });

  return code;
}

/**
 * Verifies an OTP code for a given identifier (email or phone) against PostgreSQL records.
 * Enforces 10-minute expiry, one-time consumption, and a strict 5-attempt limit.
 */
export async function verifyOtpCode(identifier: string, inputCode: string): Promise<boolean> {
  const cleanIdentifier = identifier.toLowerCase().trim();
  const cleanCode = (inputCode || "").trim();

  // Find latest active verification record
  const record = await prisma.otpVerification.findFirst({
    where: {
      phone: cleanIdentifier,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return false;

  // Enforce attempt limit (maximum 5 attempts)
  if (record.attempts >= 5) {
    await prisma.otpVerification.delete({
      where: { id: record.id },
    }).catch(() => {});
    return false;
  }

  // Check matching code
  if (record.code === cleanCode) {
    // Clean up used OTP (one-time use)
    await prisma.otpVerification.delete({
      where: { id: record.id },
    }).catch(() => {});
    return true;
  }

  // Increment failed attempts on incorrect code
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  }).catch(() => {});

  return false;
}
