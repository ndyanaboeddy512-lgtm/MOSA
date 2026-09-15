import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const community = searchParams.get("community") || undefined;
  const search = searchParams.get("search") || undefined;
  const openNowOnly = searchParams.get("openNowOnly") === "true";

  const businesses = store.getBusinesses({ category, community, search, openNowOnly });
  return NextResponse.json({ success: true, count: businesses.length, businesses });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.category) {
      return NextResponse.json({ error: "Missing required fields (name, category)" }, { status: 400 });
    }

    const newBiz = store.registerBusiness(body);
    return NextResponse.json({ success: true, business: newBiz }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to register business" }, { status: 500 });
  }
}
