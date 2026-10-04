import { NextResponse } from "next/server";
import { interpretRwandaLocationDescription } from "@/lib/geocoding";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const description = (body.description || body.query || body.text || "").trim();
    const context = body.context || undefined;

    if (!description) {
      return NextResponse.json(
        { success: false, error: "Location description is required" },
        { status: 400 }
      );
    }

    const result = await interpretRwandaLocationDescription(description, context);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("[Geocode API] Error processing location:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to geocode location description",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const description = (searchParams.get("description") || searchParams.get("q") || "").trim();
    const province = searchParams.get("province") || undefined;
    const district = searchParams.get("district") || undefined;
    const sector = searchParams.get("sector") || undefined;

    if (!description) {
      return NextResponse.json(
        { success: false, error: "Query parameter 'description' or 'q' is required" },
        { status: 400 }
      );
    }

    const context = (province || district || sector) ? { province, district, sector } : undefined;
    const result = await interpretRwandaLocationDescription(description, context);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("[Geocode API] GET Error processing location:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to geocode location description",
      },
      { status: 500 }
    );
  }
}
