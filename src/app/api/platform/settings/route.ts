import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FALLBACK_SETTINGS = {
  id: "default",
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
  updatedBy: null,
  updatedAt: new Date().toISOString(),
};

/**
 * GET /api/platform/settings
 * Public endpoint to fetch public platform identity settings.
 * Returns live database values or safe defaults if database is unreachable.
 */
export async function GET() {
  try {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: "default" },
    });

    if (settings) {
      return NextResponse.json(settings, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });
    }

    return NextResponse.json(FALLBACK_SETTINGS);
  } catch (error) {
    console.error("[PlatformSettings API GET Error]:", error);
    return NextResponse.json(FALLBACK_SETTINGS);
  }
}
