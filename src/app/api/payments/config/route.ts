import { NextResponse } from "next/server";
import { getActiveFeeConfig, getPaymentProviders } from "@/lib/payments/engine";

export async function GET() {
  try {
    const feeConfig = await getActiveFeeConfig();
    const providers = await getPaymentProviders(true);

    return NextResponse.json({
      success: true,
      fee: {
        amount: feeConfig.amount,
        currency: feeConfig.currency,
        reason: feeConfig.reason,
        effectiveFrom: feeConfig.effectiveFrom,
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
