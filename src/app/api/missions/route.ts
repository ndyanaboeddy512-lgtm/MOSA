import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  const missions = store.getMissions();
  return NextResponse.json({ success: true, count: missions.length, missions });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { missionId } = body;
    if (!missionId) {
      return NextResponse.json({ error: "Missing missionId" }, { status: 400 });
    }
    const ok = store.completeMission(missionId);
    return NextResponse.json({ success: ok });
  } catch {
    return NextResponse.json({ error: "Failed to update mission" }, { status: 500 });
  }
}
