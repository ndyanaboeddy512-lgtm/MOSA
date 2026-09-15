import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  const demands = store.getDemands();
  return NextResponse.json({ success: true, count: demands.length, demands });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;
    if (query) {
      store.recordSearchDemand(query);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to record demand" }, { status: 500 });
  }
}
