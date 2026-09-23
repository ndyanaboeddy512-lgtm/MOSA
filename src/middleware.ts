import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "mosa-community-network-secure-jwt-secret-key-rwanda-2026"
);

const SESSION_COOKIE_NAME = "mosa_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define protected route segments
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isAgentRoute = pathname.startsWith("/agent");
  const isOwnerRoute = pathname.startsWith("/owner");

  if (!isAdminRoute && !isAgentRoute && !isOwnerRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // If no session token is present
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized: authentication required" }, { status: 401 });
    }
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    const role = payload.role as string;

    // 1. Admin Route Protection: Only SUPER_ADMIN, COMMUNITY_ADMIN, MODERATOR
    if (isAdminRoute) {
      if (role !== "SUPER_ADMIN" && role !== "COMMUNITY_ADMIN" && role !== "MODERATOR") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden: administrator privileges required" }, { status: 403 });
        }
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        loginUrl.searchParams.set("reason", "admin_required");
        return NextResponse.redirect(loginUrl);
      }
    }

    // 2. Agent Route Protection: Only COMMUNITY_AGENT, SUPER_ADMIN
    if (isAgentRoute) {
      if (role !== "COMMUNITY_AGENT" && role !== "SUPER_ADMIN") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden: community agent privileges required" }, { status: 403 });
        }
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        loginUrl.searchParams.set("reason", "agent_required");
        return NextResponse.redirect(loginUrl);
      }
    }

    // 3. Owner Route Protection: Only BUSINESS_OWNER, SUPER_ADMIN
    if (isOwnerRoute) {
      if (role !== "BUSINESS_OWNER" && role !== "SUPER_ADMIN") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden: business proprietor privileges required" }, { status: 403 });
        }
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        loginUrl.searchParams.set("reason", "owner_required");
        return NextResponse.redirect(loginUrl);
      }
    }

    // Forward authenticated user data in headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId as string);
    requestHeaders.set("x-user-role", role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized: invalid session token" }, { status: 401 });
    }
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/agent/:path*",
    "/owner/:path*",
  ],
};
