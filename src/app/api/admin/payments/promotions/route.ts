import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createFeePromotion,
  updateFeePromotion,
  setFeePromotionStatus,
  getFeePromotions,
  confirmFreeRegistrationWithWaiver,
} from "@/lib/payments/promotions-engine";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access to fee promotions." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const promotions = await getFeePromotions(includeArchived);

    // Fetch distinct business categories for targeting
    const businesses = await prisma.business.findMany({
      select: { category: true, categoryDisplay: true },
      distinct: ["category"],
      where: { category: { not: "" } },
      take: 50,
    });
    const categories = Array.from(
      new Set(
        businesses
          .map((b) => b.categoryDisplay || b.category)
          .filter((c): c is string => Boolean(c && c.trim().length > 0))
      )
    ).sort();

    return NextResponse.json({
      success: true,
      promotions,
      categories,
    });
  } catch (error: any) {
    console.error("[PROMOTIONS_GET_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load fee promotions." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === "CREATE_PROMOTION") {
      const {
        name,
        code,
        description,
        reason,
        promotionType,
        discountValue,
        appliesTo,
        targetScope,
        targetCategory,
        targetBusinessIds,
        status,
        startDate,
        endDate,
        maxUsageCount,
      } = body;

      const promo = await createFeePromotion({
        name,
        code,
        description,
        reason,
        promotionType,
        discountValue: Number(discountValue || 0),
        appliesTo,
        targetScope,
        targetCategory,
        targetBusinessIds,
        status,
        startDate,
        endDate,
        maxUsageCount,
        adminId: currentUser.id,
      });

      return NextResponse.json({
        success: true,
        message: `Promotion "${promo.name}" created successfully.`,
        promotion: promo,
      });
    }

    if (action === "UPDATE_PROMOTION") {
      const {
        id,
        name,
        code,
        description,
        reason,
        promotionType,
        discountValue,
        appliesTo,
        targetScope,
        targetCategory,
        targetBusinessIds,
        status,
        startDate,
        endDate,
        maxUsageCount,
      } = body;

      if (!id) {
        return NextResponse.json(
          { success: false, error: "Promotion id is required." },
          { status: 400 }
        );
      }

      const updated = await updateFeePromotion({
        id,
        name,
        code,
        description,
        reason,
        promotionType,
        discountValue: discountValue !== undefined ? Number(discountValue) : undefined,
        appliesTo,
        targetScope,
        targetCategory,
        targetBusinessIds,
        status,
        startDate,
        endDate,
        maxUsageCount,
        adminId: currentUser.id,
      });

      return NextResponse.json({
        success: true,
        message: `Promotion "${updated.name}" updated successfully.`,
        promotion: updated,
      });
    }

    if (action === "SET_STATUS") {
      const { id, status, reason } = body;

      if (!id || !status) {
        return NextResponse.json(
          { success: false, error: "id and status are required." },
          { status: 400 }
        );
      }

      if (!["ACTIVE", "PAUSED", "ARCHIVED"].includes(status)) {
        return NextResponse.json(
          { success: false, error: "Invalid status value." },
          { status: 400 }
        );
      }

      const updated = await setFeePromotionStatus({
        id,
        status,
        adminId: currentUser.id,
        reason: reason || `Promotion status set to ${status} by administrator.`,
      });

      return NextResponse.json({
        success: true,
        message: `Promotion "${updated.name}" status changed to ${status}.`,
        promotion: updated,
      });
    }

    if (action === "CONFIRM_ADMIN_WAIVER") {
      const { businessId, payerUserId, promotionId, reason } = body;

      if (!businessId) {
        return NextResponse.json(
          { success: false, error: "businessId is required." },
          { status: 400 }
        );
      }

      const waiverResult = await confirmFreeRegistrationWithWaiver({
        businessId,
        payerUserId: payerUserId || currentUser.id,
        promotionId,
        reason,
        adminId: currentUser.id,
      });

      return NextResponse.json(waiverResult);
    }

    return NextResponse.json(
      { success: false, error: "Invalid action specified." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[PROMOTIONS_POST_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process promotion operation." },
      { status: 400 }
    );
  }
}
