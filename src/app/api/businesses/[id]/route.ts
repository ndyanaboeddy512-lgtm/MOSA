import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const business = store.getBusinessById(resolvedParams.id);
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, business });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const body = await request.json();
    const { action, status, userId, details } = body;

    if (action === "VERIFY" && status) {
      const ok = store.updateBusinessVerification(resolvedParams.id, status, details);
      return NextResponse.json({ success: ok });
    }

    if (action === "CLAIM" && userId) {
      const ok = store.claimBusiness(resolvedParams.id, userId);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to update business" }, { status: 500 });
  }
}
