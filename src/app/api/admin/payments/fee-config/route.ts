import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getActiveFeeConfig,
  getPaymentProviders,
  updateRegistrationFeeConfig,
  updatePaymentProviderConfig,
} from "@/lib/payments/engine";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access to fee configurations." },
        { status: 403 }
      );
    }

    const activeFee = await getActiveFeeConfig();
    const feeHistory = await prisma.registrationFeeConfig.findMany({
      orderBy: { effectiveFrom: "desc" },
      take: 20,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const providers = await getPaymentProviders(false);

    return NextResponse.json({
      success: true,
      activeFee,
      feeHistory,
      providers,
    });
  } catch (error: any) {
    console.error("[FEE_CONFIG_GET_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load fee configuration." },
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

    if (action === "UPDATE_FEE") {
      const {
        amount,
        renewalAmount,
        gracePeriodDays,
        reminderSchedule,
        currency = "RWF",
        reason,
      } = body;

      if (amount === undefined || isNaN(Number(amount)) || Number(amount) < 0) {
        return NextResponse.json(
          { success: false, error: "Valid non-negative registration fee amount is required." },
          { status: 400 }
        );
      }

      const updated = await updateRegistrationFeeConfig({
        amount: Number(amount),
        renewalAmount: renewalAmount !== undefined ? Number(renewalAmount) : undefined,
        gracePeriodDays: gracePeriodDays !== undefined ? Number(gracePeriodDays) : 7,
        reminderSchedule: reminderSchedule || "30,14,7,0",
        currency: currency || "RWF",
        reason: reason || "Registration & Renewal Fee Settings updated by Administrator",
        adminId: currentUser.id,
      });

      return NextResponse.json({
        success: true,
        message: `Registration fee (${updated.amount} ${updated.currency}) and Renewal fee (${updated.renewalAmount} ${updated.currency}) successfully updated.`,
        config: updated,
      });
    }

    if (action === "UPDATE_PROVIDER") {
      const {
        provider,
        name,
        isEnabled,
        accountNumber,
        accountName,
        instructions,
        instructionsRw,
        webhookSecret,
      } = body;

      if (!provider || !name) {
        return NextResponse.json(
          { success: false, error: "Provider code and name are required." },
          { status: 400 }
        );
      }

      const updated = await updatePaymentProviderConfig({
        provider,
        name,
        isEnabled: Boolean(isEnabled),
        accountNumber,
        accountName,
        instructions,
        instructionsRw,
        webhookSecret,
        adminId: currentUser.id,
      });

      return NextResponse.json({
        success: true,
        message: `Provider ${provider} updated successfully.`,
        provider: updated,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action specified." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[FEE_CONFIG_POST_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update configuration." },
      { status: 400 }
    );
  }
}
