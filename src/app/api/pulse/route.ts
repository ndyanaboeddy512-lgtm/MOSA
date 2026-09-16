import { NextResponse } from "next/server";
import { getCommunityPulse } from "@/lib/pulse-engine";

/**
 * GET /api/pulse
 * Returns live community intelligence: What's New, What's Needed, What's Popular, What's Available, What's Changing, and Hidden Gems.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get("sector") || undefined;
  const cell = searchParams.get("cell") || undefined;

  try {
    const pulse = await getCommunityPulse(sector, cell);
    return NextResponse.json({
      success: true,
      sector: sector || "ALL",
      cell: cell || "ALL",
      pulse,
    });
  } catch (error) {
    console.error("[Pulse GET Error]:", error);
    return NextResponse.json({ error: "Failed to aggregate community pulse" }, { status: 500 });
  }
}
