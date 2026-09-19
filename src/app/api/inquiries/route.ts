import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InquiryType } from "@prisma/client";

/**
 * POST /api/inquiries
 * Public telemetry and inquiry capture endpoint.
 * Logs customer interactions (WhatsApp clicks, phone calls, directions views)
 * and records direct responses to business opportunities.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action = "TELEMETRY",
      businessId,
      opportunityId,
      type = "WHATSAPP_CLICK",
      channel = "PUBLIC_WEB",
      productId,
      itemName,
      itemPrice,
      applicantName,
      applicantPhone,
      message,
    } = body;

    // Flow 1: Applicant responding to an opportunity
    if (action === "OPPORTUNITY_APPLY" || opportunityId) {
      if (!opportunityId || !applicantName || !applicantPhone) {
        return NextResponse.json(
          { error: "opportunityId, applicantName, and applicantPhone are required" },
          { status: 400 }
        );
      }

      const opp = await prisma.businessOpportunity.findUnique({
        where: { id: opportunityId },
        select: { id: true, businessId: true, status: true, title: true },
      });

      if (!opp || opp.status !== "OPEN") {
        return NextResponse.json(
          { error: "This opportunity is no longer accepting inquiries" },
          { status: 404 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const inquiry = await tx.opportunityInquiry.create({
          data: {
            opportunityId,
            applicantName: applicantName.trim(),
            applicantPhone: applicantPhone.trim(),
            message: message?.trim() || null,
            status: "NEW",
          },
        });

        await tx.businessOpportunity.update({
          where: { id: opportunityId },
          data: { responsesCount: { increment: 1 } },
        });

        await tx.customerInquiry.create({
          data: {
            businessId: opp.businessId,
            type: InquiryType.OPPORTUNITY_RESPONSE,
            channel: channel || "PUBLIC_WEB",
            itemName: opp.title,
          },
        });

        return inquiry;
      });

      return NextResponse.json({ success: true, inquiryId: result.id }, { status: 201 });
    }

    // Flow 2: General Interaction Telemetry (WhatsApp, Phone, Directions, Items)
    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    // Validate type enum
    const validTypes = Object.values(InquiryType);
    const inquiryType = validTypes.includes(type) ? (type as InquiryType) : InquiryType.WHATSAPP_CLICK;

    await prisma.$transaction(async (tx) => {
      await tx.customerInquiry.create({
        data: {
          businessId,
          productId: productId || null,
          type: inquiryType,
          channel: channel || "PUBLIC_WEB",
          itemName: itemName || null,
          itemPrice: itemPrice !== undefined && itemPrice !== null ? Number(itemPrice) : null,
        },
      });

      // If it's a contact event, also increment the business contactClicksCount
      if (
        inquiryType === InquiryType.WHATSAPP_CLICK ||
        inquiryType === InquiryType.PHONE_CALL ||
        inquiryType === InquiryType.BOOKING_REQUEST ||
        inquiryType === InquiryType.ORDER_INQUIRY
      ) {
        await tx.business.update({
          where: { id: businessId },
          data: { contactClicksCount: { increment: 1 } },
        });
      }
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[Inquiry Telemetry POST Error]:", error);
    return NextResponse.json({ error: "Failed to record inquiry" }, { status: 500 });
  }
}
