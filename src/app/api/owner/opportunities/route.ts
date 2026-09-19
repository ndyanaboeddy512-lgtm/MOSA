import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role, OpportunityType, OpportunityStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

/**
 * GET /api/owner/opportunities
 * Fetches all business opportunities and incoming inquiries for the authenticated owner's business.
 */
export async function GET(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedBizId = searchParams.get("businessId");

  try {
    let businessId: string;

    if (requestedBizId) {
      const targetBiz = await prisma.business.findUnique({
        where: { id: requestedBizId },
        select: { id: true, ownerId: true },
      });

      if (!targetBiz) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 });
      }

      if (auth.user.role === Role.BUSINESS_OWNER && targetBiz.ownerId !== auth.user.id) {
        return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
      }

      businessId = targetBiz.id;
    } else {
      const biz = await prisma.business.findFirst({
        where: { ownerId: auth.user.id },
        select: { id: true },
      });
      if (!biz) {
        return NextResponse.json({ error: "No business found for this owner" }, { status: 404 });
      }
      businessId = biz.id;
    }

    const opportunities = await prisma.businessOpportunity.findMany({
      where: { businessId },
      include: {
        inquiries: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, opportunities });
  } catch (error) {
    console.error("[Owner Opportunities GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
  }
}

/**
 * POST /api/owner/opportunities
 * Creates a new business opportunity (Hiring, Supplier Request, Partnership, Collaboration).
 */
export async function POST(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const {
      businessId,
      type = "EMPLOYMENT",
      title,
      titleRw,
      description,
      descriptionRw,
      requirements,
      compensation,
      contactMethod = "WHATSAPP",
      contactValue,
      deadline,
    } = body;

    if (!businessId || !title || !description) {
      return NextResponse.json({ error: "businessId, title, and description are required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true, phone: true, whatsapp: true },
    });

    if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.COMMUNITY_ADMIN)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage opportunities for this business" }, { status: 403 });
    }

    const validTypes = Object.values(OpportunityType);
    const oppType = validTypes.includes(type) ? (type as OpportunityType) : OpportunityType.EMPLOYMENT;
    const deadlineDate = deadline ? new Date(deadline) : null;

    // Default contactValue to business whatsapp or phone if not specified
    const finalContactValue = contactValue?.trim() || (contactMethod === "WHATSAPP" ? (business.whatsapp || business.phone) : business.phone);

    const opportunity = await prisma.$transaction(async (tx) => {
      const created = await tx.businessOpportunity.create({
        data: {
          businessId,
          type: oppType,
          title: title.trim(),
          titleRw: titleRw?.trim() || null,
          description: description.trim(),
          descriptionRw: descriptionRw?.trim() || null,
          requirements: requirements?.trim() || null,
          compensation: compensation?.trim() || null,
          contactMethod,
          contactValue: finalContactValue,
          deadline: deadlineDate,
          status: OpportunityStatus.OPEN,
          moderationStatus: "APPROVED",
        },
      });

      await tx.businessChangeHistory.create({
        data: {
          businessId,
          actorId: auth.user!.id,
          action: "OPPORTUNITY_CREATED",
          fieldChanged: "opportunities",
          previousValue: null,
          newValue: `[${oppType}] ${created.title}`,
          approvalStatus: "APPROVED",
          source: "OWNER_PORTAL",
        },
      });

      return created;
    });

    await logAuditEvent({
      actorId: auth.user.id,
      action: "OPPORTUNITY_CREATED",
      entityType: "BUSINESS_OPPORTUNITY",
      entityId: opportunity.id,
      metadata: { businessId, type: opportunity.type, title: opportunity.title },
    });

    revalidatePath(`/business/${businessId}`);
    return NextResponse.json({ success: true, opportunity }, { status: 201 });
  } catch (error) {
    console.error("[Owner Opportunities POST Error]:", error);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}

/**
 * PATCH /api/owner/opportunities
 * Modifies opportunity details/status OR modifies applicant inquiry status.
 */
export async function PATCH(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      businessId,
      inquiryId,
      inquiryStatus,
      status,
      title,
      titleRw,
      description,
      descriptionRw,
      requirements,
      compensation,
      contactMethod,
      contactValue,
      deadline,
    } = body;

    // Scenario A: Update Inquiry status
    if (inquiryId && inquiryStatus) {
      const inquiry = await prisma.opportunityInquiry.findUnique({
        where: { id: inquiryId },
        include: { opportunity: { select: { businessId: true } } },
      });

      if (!inquiry) {
        return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
      }

      const business = await prisma.business.findUnique({
        where: { id: inquiry.opportunity.businessId },
        select: { ownerId: true },
      });

      if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.COMMUNITY_ADMIN)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const updatedInquiry = await prisma.opportunityInquiry.update({
        where: { id: inquiryId },
        data: { status: inquiryStatus },
      });

      return NextResponse.json({ success: true, inquiry: updatedInquiry });
    }

    // Scenario B: Update Opportunity
    if (!id || !businessId) {
      return NextResponse.json({ error: "id and businessId are required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.COMMUNITY_ADMIN)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingOpp = await prisma.businessOpportunity.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });

    if (!existingOpp || existingOpp.businessId !== businessId) {
      return NextResponse.json({ error: "Opportunity not found or does not belong to this business" }, { status: 404 });
    }

    const updated = await prisma.businessOpportunity.update({
      where: { id },
      data: {
        ...(status && { status: status as OpportunityStatus }),
        ...(title !== undefined && { title: title.trim() }),
        ...(titleRw !== undefined && { titleRw: titleRw ? titleRw.trim() : null }),
        ...(description !== undefined && { description: description.trim() }),
        ...(descriptionRw !== undefined && { descriptionRw: descriptionRw ? descriptionRw.trim() : null }),
        ...(requirements !== undefined && { requirements: requirements ? requirements.trim() : null }),
        ...(compensation !== undefined && { compensation: compensation ? compensation.trim() : null }),
        ...(contactMethod !== undefined && { contactMethod }),
        ...(contactValue !== undefined && { contactValue: contactValue ? contactValue.trim() : null }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      },
    });

    revalidatePath(`/business/${businessId}`);
    return NextResponse.json({ success: true, opportunity: updated });
  } catch (error) {
    console.error("[Owner Opportunities PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update opportunity" }, { status: 500 });
  }
}

/**
 * DELETE /api/owner/opportunities
 * Deletes an opportunity record.
 */
export async function DELETE(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const businessId = searchParams.get("businessId");

    if (!id || !businessId) {
      return NextResponse.json({ error: "id and businessId are required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.COMMUNITY_ADMIN)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingOpp = await prisma.businessOpportunity.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });

    if (!existingOpp || existingOpp.businessId !== businessId) {
      return NextResponse.json({ error: "Opportunity not found or does not belong to this business" }, { status: 404 });
    }

    await prisma.businessOpportunity.delete({
      where: { id },
    });

    revalidatePath(`/business/${businessId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Owner Opportunities DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to delete opportunity" }, { status: 500 });
  }
}
