import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const reviews = store.getReviewsForBusiness(businessId);
  return NextResponse.json({ success: true, count: reviews.length, reviews });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId, userName, rating, comment, userRole = "CUSTOMER" } = body;

    if (!businessId || !comment) {
      return NextResponse.json({ error: "Missing required review fields" }, { status: 400 });
    }

    const newRev = store.addReview({
      businessId,
      userName: userName || "Verified Resident",
      userRole,
      rating: rating || 5,
      comment,
      commentRw: comment,
      verifiedVisit: true,
    });

    return NextResponse.json({ success: true, review: newRev }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to post review" }, { status: 500 });
  }
}
