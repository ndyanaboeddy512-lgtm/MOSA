import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { store } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId parameter" }, { status: 400 });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { businessId },
      include: {
        user: {
          select: { id: true, name: true, role: true, badges: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (reviews.length > 0) {
      return NextResponse.json({
        success: true,
        count: reviews.length,
        source: "database",
        reviews: reviews.map((r) => ({
          id: r.id,
          businessId: r.businessId,
          userName: r.user?.name || "Verified Resident",
          userRole: r.user?.role || "CUSTOMER",
          rating: r.rating,
          comment: r.comment,
          commentRw: r.commentRw || r.comment,
          verifiedVisit: r.verifiedVisit,
          date: r.createdAt.toISOString().split("T")[0],
        })),
      });
    }
  } catch (error) {
    console.warn("[Reviews DB Fallback]:", error);
  }

  // Fallback to store
  const storeReviews = store.getReviewsForBusiness(businessId);
  return NextResponse.json({
    success: true,
    count: storeReviews.length,
    source: "seed_cache",
    reviews: storeReviews,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      businessId, 
      userName = "Verified Resident", 
      rating = 5, 
      comment, 
      commentRw,
      userRole = "CUSTOMER" 
    } = body;

    if (!businessId || !comment) {
      return NextResponse.json({ error: "Missing businessId or review comment" }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    let userId = currentUser?.id;

    if (!userId) {
      // Find or create resident user for anonymous verified submission
      const resident = await prisma.user.upsert({
        where: { phone: "+250788999888" },
        update: {},
        create: {
          phone: "+250788999888",
          name: userName,
          role: "CUSTOMER",
          community: "Nyamirambo",
          points: 120,
          badges: ["Neighborhood Explorer"],
          referralCode: "MOSA-NYA-999",
        },
      }).catch(() => null);
      userId = resident?.id;
    }

    let savedReview = null;

    if (userId) {
      try {
        savedReview = await prisma.review.create({
          data: {
            businessId,
            userId,
            rating: Number(rating) || 5,
            comment,
            commentRw: commentRw || comment,
            verifiedVisit: true,
          },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        });

        // Award reviewer 10 community points
        await prisma.user.update({
          where: { id: userId },
          data: { points: { increment: 10 } },
        }).catch(() => {});

        // Audit log
        await logAuditEvent({
          actorId: userId,
          action: "REVIEW_SUBMITTED",
          entityType: "REVIEW",
          entityId: savedReview.id,
          metadata: { businessId, rating },
        });
      } catch (dbError) {
        console.warn("[Review Create DB Warning]:", dbError);
      }
    }

    // Keep store synchronized
    const newStoreRev = store.addReview({
      businessId,
      userName: currentUser?.name || userName,
      userRole: (currentUser?.role as any) || userRole,
      rating: Number(rating) || 5,
      comment,
      commentRw: commentRw || comment,
      verifiedVisit: true,
    });

    return NextResponse.json({
      success: true,
      review: savedReview
        ? {
            id: savedReview.id,
            businessId: savedReview.businessId,
            userName: savedReview.user?.name || userName,
            rating: savedReview.rating,
            comment: savedReview.comment,
            date: savedReview.createdAt.toISOString().split("T")[0],
          }
        : newStoreRev,
    }, { status: 201 });
  } catch (error) {
    console.error("[Review POST Error]:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
