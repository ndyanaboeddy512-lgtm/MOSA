import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

const DEMO_PRESETS: Record<
  string,
  { name: string; phone: string; role: Role; community: string; points: number; badges: string[] }
> = {
  SUPER_ADMIN: {
    name: "Diane Uwera",
    phone: "+250788000001",
    role: "SUPER_ADMIN",
    community: "Kigali Central",
    points: 1500,
    badges: ["Super Administrator", "Governance Lead"],
  },
  COMMUNITY_ADMIN: {
    name: "Patrick Ndayisaba",
    phone: "+250788000002",
    role: "COMMUNITY_ADMIN",
    community: "Nyamirambo Sector",
    points: 850,
    badges: ["Sector Lead", "Community Organizer"],
  },
  COMMUNITY_AGENT: {
    name: "Emmanuel Hakizimana",
    phone: "+250788000003",
    role: "COMMUNITY_AGENT",
    community: "Biryogo",
    points: 420,
    badges: ["Certified Agent", "Local Scout", "Quality Rank #1"],
  },
  BUSINESS_OWNER: {
    name: "Kevine Mukashyaka (Salon Owner)",
    phone: "+250788123456",
    role: "BUSINESS_OWNER",
    community: "Biryogo Car-Free Zone",
    points: 210,
    badges: ["Verified Business Owner", "Early Pioneer"],
  },
  CUSTOMER: {
    name: "Jean-Paul Mugisha",
    phone: "+250788999888",
    role: "CUSTOMER",
    community: "Cosmos, Nyamirambo",
    points: 120,
    badges: ["Neighborhood Explorer", "Top Reviewer"],
  },
  MODERATOR: {
    name: "Clarisse Keza",
    phone: "+250788555444",
    role: "MODERATOR",
    community: "Rwezamenyo",
    points: 390,
    badges: ["Trust Guardian", "Fact Checker"],
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const roleKey = (body.role as string)?.toUpperCase();
    const preset = DEMO_PRESETS[roleKey];

    if (!preset) {
      return NextResponse.json(
        { error: `Invalid demo role: ${roleKey}. Available: ${Object.keys(DEMO_PRESETS).join(", ")}` },
        { status: 400 }
      );
    }

    // Production Security Guard:
    // Prohibit privilege escalation via unauthenticated demo-switch in production
    // unless explicitly permitted via ENABLE_DEMO_SWITCH=true for staging evaluations.
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ENABLE_DEMO_SWITCH !== "true"
    ) {
      return NextResponse.json(
        { error: "Demo role switching is disabled in production. Authenticate via verified phone OTP." },
        { status: 403 }
      );
    }

    // Upsert demo user in PostgreSQL database
    let user;
    try {
      user = await prisma.user.upsert({
        where: { phone: preset.phone },
        update: {
          name: preset.name,
          role: preset.role,
          community: preset.community,
          points: preset.points,
          badges: preset.badges,
          status: "ACTIVE",
          updatedAt: new Date(),
        },
        create: {
          phone: preset.phone,
          name: preset.name,
          role: preset.role,
          community: preset.community,
          points: preset.points,
          badges: preset.badges,
          referralCode: `MOSA-${preset.community.slice(0, 3).toUpperCase()}-${preset.phone.slice(-3)}`,
          language: "rw",
          status: "ACTIVE",
        },
      });

      // Issue signed JWT token
      const token = await createSessionToken({
        userId: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
      });

      // Persist session in PostgreSQL
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      }).catch(() => {});

      // Set HTTP-only cookie
      await setSessionCookie(token);

      // Log audit event
      await logAuditEvent({
        actorId: user.id,
        action: "DEMO_ROLE_SWITCHED",
        entityType: "USER",
        entityId: user.id,
        metadata: { role: user.role, phone: user.phone },
      });
    } catch (dbError) {
      console.warn("[Demo Switch DB Warning]:", dbError);
      // Fallback object if DB is temporarily unreachable
      user = {
        id: `user-${preset.role.toLowerCase()}`,
        name: preset.name,
        phone: preset.phone,
        role: preset.role,
        community: preset.community,
        points: preset.points,
        badges: preset.badges,
        referralCode: `MOSA-${preset.community.slice(0, 3).toUpperCase()}-DEMO`,
        language: "rw",
      };

      const token = await createSessionToken({
        userId: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
      });
      await setSessionCookie(token);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        community: user.community,
        points: user.points,
        badges: user.badges,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    console.error("[Demo Switch Error]:", error);
    return NextResponse.json({ error: "Failed to switch demo role" }, { status: 500 });
  }
}
