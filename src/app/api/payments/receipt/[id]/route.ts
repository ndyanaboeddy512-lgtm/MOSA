import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    const receipt = await prisma.registrationReceipt.findFirst({
      where: {
        OR: [
          { id },
          { receiptNumber: id },
          { paymentId: id },
        ],
      },
      include: {
        payment: true,
        business: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            phone: true,
            category: true,
            cell: true,
            sector: true,
            district: true,
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json(
        { success: false, error: "Receipt not found." },
        { status: 404 }
      );
    }

    // Role and ownership check
    if (currentUser) {
      const isAdmin = ["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(currentUser.role);
      const isOwner = receipt.business.ownerId === currentUser.id;
      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { success: false, error: "Unauthorized access to this receipt." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      receipt: {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        issuedAt: receipt.issuedAt,
        amountPaid: receipt.amountPaid,
        currency: receipt.currency,
        paymentMethod: receipt.paymentMethod,
        providerTransactionRef: receipt.providerTransactionRef,
        businessName: receipt.businessName,
        ownerName: receipt.ownerName,
        ownerPhone: receipt.ownerPhone,
        metadata: receipt.metadata ? JSON.parse(receipt.metadata) : null,
        payment: {
          paymentReference: receipt.payment.paymentReference,
          status: receipt.payment.status,
          verifiedAt: receipt.payment.verifiedAt,
          verifiedBy: receipt.payment.verifiedBy,
        },
        business: receipt.business,
      },
    });
  } catch (error: any) {
    console.error("[RECEIPT_FETCH_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve receipt." },
      { status: 500 }
    );
  }
}
