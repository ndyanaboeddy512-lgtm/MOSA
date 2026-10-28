import { NextRequest, NextResponse } from "next/server";
import { getPaymentProviders } from "@/lib/payments/engine";
import { calculateEffectiveFee } from "@/lib/payments/promotions-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") || undefined;
    const category = searchParams.get("category") || undefined;
    const feeTypeParam = searchParams.get("feeType");
    const feeType = feeTypeParam === "ANNUAL_RENEWAL" ? "ANNUAL_RENEWAL" : "REGISTRATION";

    const feeCalculation = await calculateEffectiveFee({
      businessId,
      category,
      feeType,
    });

    const providers = await getPaymentProviders(true);

    return NextResponse.json({
      success: true,
      fee: {
        amount: feeCalculation.effectiveFee,
        baseAmount: feeCalculation.baseFee,
        discount: feeCalculation.discount,
        isFree: feeCalculation.isFree,
        currency: feeCalculation.currency,
        promotion: feeCalculation.promotion,
        renewalAmount: feeCalculation.feeConfig.renewalAmount,
        gracePeriodDays: feeCalculation.feeConfig.gracePeriodDays,
        reminderSchedule: feeCalculation.feeConfig.reminderSchedule,
      },
      providers: providers.map((p) => ({
        id: p.id,
        provider: p.provider,
        name: p.name,
        accountNumber: p.accountNumber,
        accountName: p.accountName,
        instructions: p.instructions,
        instructionsRw: p.instructionsRw,
      })),
    });
  } catch (error: any) {
    console.error("[PAYMENTS_CONFIG_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load payment configuration." },
      { status: 500 }
    );
  }
}
