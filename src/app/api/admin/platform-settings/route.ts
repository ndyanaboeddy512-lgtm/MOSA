import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  platformName: "MOSA",
  platformNameRw: "MOSA",
  tagline: "Neighborhood Commerce & Authentic Price Intelligence",
  taglineRw: "Urubuga rw'Ubucuruzi bw'Ibiciro by'Ukuri mu Rwanda",
  shortDescription: "Rwanda's Community Commerce Discovery Network",
  shortDescriptionRw: "Urusobe rw'Ikoranabuhanga ry'Ubucuruzi n'Ibiciro by'Ukuri mu Rwanda",
  logoUrl: null,
  faviconUrl: null,
  heroBannerUrl: null,
  officialEmail: "contact@mosa.rw",
  officialPhone: "+250 788 000 000",
  officialWhatsapp: "+250 788 000 000",
  officialAddress: "Kigali, Rwanda • Nyarugenge • Nyamirambo Pilot Hub",
  officialAddressRw: "Kigali, u Rwanda • Nyarugenge • Ihuriro rya Nyamirambo",
  supportedLanguages: "rw,en,fr,sw",
  operatingHours: "Monday - Saturday: 08:00 - 18:00 CAT",
  operatingHoursRw: "Kuwa Mbere - Kuwa Gatandatu: 08:00 - 18:00 CAT",
  socialLinks: JSON.stringify({
    twitter: "https://twitter.com",
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
    youtube: "",
  }),
  brandAssets: JSON.stringify({
    brandColor: "#059669",
  }),
  copyrightText: "MOSA Network (Rwanda). Built for sustainable, ethical community discovery.",
};

/**
 * GET /api/admin/platform-settings
 * Fetches platform settings with audit log history for Command Center.
 */
export async function GET() {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    let settings = await prisma.platformSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {
          id: "default",
          ...DEFAULT_SETTINGS,
          updatedBy: auth.user.name,
        },
      });
    }

    // Fetch recent audit logs for platform settings
    const recentAudits = await prisma.auditLog.findMany({
      where: { entityType: "PLATFORM_SETTINGS" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      settings,
      recentAudits,
    });
  } catch (error: any) {
    console.error("[Admin PlatformSettings GET Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to load platform settings" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/platform-settings
 * Updates platform identity & controls with RBAC enforcement and persistent audit logging.
 */
export async function PATCH(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await req.json();

    // Input sanitization and validation
    const updateData: Record<string, any> = {};

    if (body.platformName !== undefined) {
      const name = String(body.platformName).trim();
      if (!name || name.length > 100) {
        return NextResponse.json({ error: "Platform name must be between 1 and 100 characters." }, { status: 400 });
      }
      updateData.platformName = name;
    }

    if (body.platformNameRw !== undefined) {
      updateData.platformNameRw = String(body.platformNameRw).trim() || updateData.platformName || "MOSA";
    }

    if (body.tagline !== undefined) {
      updateData.tagline = String(body.tagline).trim().slice(0, 300);
    }

    if (body.taglineRw !== undefined) {
      updateData.taglineRw = String(body.taglineRw).trim().slice(0, 300);
    }

    if (body.shortDescription !== undefined) {
      updateData.shortDescription = String(body.shortDescription).trim().slice(0, 500);
    }

    if (body.shortDescriptionRw !== undefined) {
      updateData.shortDescriptionRw = String(body.shortDescriptionRw).trim().slice(0, 500);
    }

    if (body.logoUrl !== undefined) {
      updateData.logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
    }

    if (body.faviconUrl !== undefined) {
      updateData.faviconUrl = body.faviconUrl ? String(body.faviconUrl).trim() : null;
    }

    if (body.heroBannerUrl !== undefined) {
      updateData.heroBannerUrl = body.heroBannerUrl ? String(body.heroBannerUrl).trim() : null;
    }

    if (body.officialEmail !== undefined) {
      const email = String(body.officialEmail).trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Please provide a valid official email address." }, { status: 400 });
      }
      updateData.officialEmail = email || "contact@mosa.rw";
    }

    if (body.officialPhone !== undefined) {
      updateData.officialPhone = String(body.officialPhone).trim() || "+250 788 000 000";
    }

    if (body.officialWhatsapp !== undefined) {
      updateData.officialWhatsapp = body.officialWhatsapp ? String(body.officialWhatsapp).trim() : null;
    }

    if (body.officialAddress !== undefined) {
      updateData.officialAddress = String(body.officialAddress).trim().slice(0, 255);
    }

    if (body.officialAddressRw !== undefined) {
      updateData.officialAddressRw = String(body.officialAddressRw).trim().slice(0, 255);
    }

    if (body.supportedLanguages !== undefined) {
      let langs = String(body.supportedLanguages).trim();
      const validLangs = ["rw", "en", "fr", "sw"];
      const parsedLangs = langs.split(",").map((l) => l.trim().toLowerCase()).filter((l) => validLangs.includes(l));
      
      // Enforce at least Kinyarwanda as base Rwanda language
      if (!parsedLangs.includes("rw")) {
        parsedLangs.unshift("rw");
      }
      updateData.supportedLanguages = parsedLangs.join(",");
    }

    if (body.operatingHours !== undefined) {
      updateData.operatingHours = String(body.operatingHours).trim().slice(0, 150);
    }

    if (body.operatingHoursRw !== undefined) {
      updateData.operatingHoursRw = String(body.operatingHoursRw).trim().slice(0, 150);
    }

    if (body.socialLinks !== undefined) {
      updateData.socialLinks = typeof body.socialLinks === "string" ? body.socialLinks : JSON.stringify(body.socialLinks);
    }

    if (body.brandAssets !== undefined) {
      updateData.brandAssets = typeof body.brandAssets === "string" ? body.brandAssets : JSON.stringify(body.brandAssets);
    }

    if (body.copyrightText !== undefined) {
      updateData.copyrightText = String(body.copyrightText).trim().slice(0, 255);
    }

    updateData.updatedBy = `${auth.user.name} (${auth.user.role})`;

    // Upsert to ensure singleton exists
    const updated = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        ...DEFAULT_SETTINGS,
        ...updateData,
      },
    });

    // Immutable Audit Log
    await logAuditEvent({
      action: "PLATFORM_IDENTITY_UPDATED",
      entityType: "PLATFORM_SETTINGS",
      entityId: "default",
      actorId: auth.user.id,
      metadata: {
        updatedFields: Object.keys(updateData),
        platformName: updated.platformName,
        officialEmail: updated.officialEmail,
        supportedLanguages: updated.supportedLanguages,
        adminName: auth.user.name,
        adminRole: auth.user.role,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Platform identity & controls successfully updated and audited.",
      settings: updated,
    });
  } catch (error: any) {
    console.error("[Admin PlatformSettings PATCH Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to update platform settings" }, { status: 500 });
  }
}

/**
 * POST /api/admin/platform-settings
 * Resets platform identity to system defaults.
 */
export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Super Admin authorization required to reset platform identity." }, { status: auth.status || 403 });
  }

  try {
    const updated = await prisma.platformSettings.upsert({
      where: { id: "default" },
      update: {
        ...DEFAULT_SETTINGS,
        updatedBy: `${auth.user.name} (SUPER_ADMIN)`,
      },
      create: {
        id: "default",
        ...DEFAULT_SETTINGS,
        updatedBy: `${auth.user.name} (SUPER_ADMIN)`,
      },
    });

    await logAuditEvent({
      action: "PLATFORM_IDENTITY_RESET",
      entityType: "PLATFORM_SETTINGS",
      entityId: "default",
      actorId: auth.user.id,
      metadata: {
        reason: "Admin requested restore to default MOSA branding",
        adminName: auth.user.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Platform identity successfully restored to default settings.",
      settings: updated,
    });
  } catch (error: any) {
    console.error("[Admin PlatformSettings POST Reset Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to reset platform settings" }, { status: 500 });
  }
}
