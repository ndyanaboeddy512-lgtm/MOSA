import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role, VerificationStatus } from "@prisma/client";

export async function GET(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedBizId = searchParams.get("businessId");

  try {
    let businessId = requestedBizId;

    if (!businessId || auth.user.role === Role.BUSINESS_OWNER) {
      const biz = await prisma.business.findFirst({
        where: { ownerId: auth.user.id },
        select: { id: true },
      });
      if (!biz) {
        return NextResponse.json({ error: "No business found for this owner" }, { status: 404 });
      }
      businessId = biz.id;
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        products: { where: { isArchived: false } },
        businessHours: true,
        updates: { where: { status: "ACTIVE" } },
        opportunities: { where: { status: "OPEN" }, include: { inquiries: true } },
        inquiries: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        media: true,
        reviews: true,
        verifications: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // 1. Interaction Telemetry Breakdown
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const totalInquiries = await prisma.customerInquiry.count({
      where: { businessId },
    });

    const inquiriesLast30Days = await prisma.customerInquiry.count({
      where: { businessId, createdAt: { gte: thirtyDaysAgo } },
    });

    const inquiriesLast7Days = await prisma.customerInquiry.count({
      where: { businessId, createdAt: { gte: sevenDaysAgo } },
    });

    // Grouping by type
    const inquiriesByTypeRaw = await prisma.customerInquiry.groupBy({
      by: ["type"],
      where: { businessId },
      _count: { _all: true },
    });

    const breakdownByType: Record<string, number> = {
      WHATSAPP_CLICK: 0,
      PHONE_CALL: 0,
      BOOKING_REQUEST: 0,
      ORDER_INQUIRY: 0,
      OPPORTUNITY_RESPONSE: 0,
      DIRECTIONS_VIEW: 0,
    };

    inquiriesByTypeRaw.forEach((item) => {
      breakdownByType[item.type] = item._count._all;
    });

    // Recent 10 customer inquiries
    const recentInquiries = business.inquiries.slice(0, 10).map((inq) => ({
      id: inq.id,
      type: inq.type,
      channel: inq.channel,
      itemName: inq.itemName,
      itemPrice: inq.itemPrice,
      createdAt: inq.createdAt.toISOString(),
    }));

    // 2. Profile Completeness Audit
    const missingFields: { field: string; label: string; labelRw: string }[] = [];
    if (!business.description || business.description.length < 20) {
      missingFields.push({ field: "description", label: "Add detailed business description", labelRw: "Ongeraho ibisobanuro by'ubucuruzi" });
    }
    if (!business.coverImage) {
      missingFields.push({ field: "coverImage", label: "Upload a storefront or banner cover photo", labelRw: "Ongeraho ifoto y'imbere cyangwa ibirango" });
    }
    const photoCount = business.media.filter((m) => m.mediaType !== "VIDEO").length;
    if (photoCount < 2) {
      missingFields.push({ field: "photos", label: "Upload at least 2 gallery photos", labelRw: "Ongeraho amafoto nibura 2 y'aho mukorera" });
    }
    if (business.products.length < 3) {
      missingFields.push({ field: "products", label: "Add at least 3 products or services with pricing", labelRw: "Ongeraho ibicuruzwa cyangwa serivisi nibura 3 biriho ibiciro" });
    }
    if (!business.businessHours || business.businessHours.length === 0) {
      missingFields.push({ field: "businessHours", label: "Set weekly operating hours", labelRw: "Shyiraho amasaha y'akazi ya buri munsi" });
    }
    if (!business.nearestLandmark && !business.streetName) {
      missingFields.push({ field: "location", label: "Provide street name or nearby landmark for customer discovery", labelRw: "Tanga izina ry'umuhanda cyangwa ikimenyetso kizwi cyegereye" });
    }
    if (!business.whatsapp) {
      missingFields.push({ field: "whatsapp", label: "Connect WhatsApp for fast customer direct messaging", labelRw: "Shyiraho numero ya WhatsApp y'akazi" });
    }

    const totalAuditCheckpoints = 7;
    const completedCheckpoints = totalAuditCheckpoints - missingFields.length;
    const completenessPercentage = Math.round((completedCheckpoints / totalAuditCheckpoints) * 100);

    // 3. 6-Stage Business Journey Progress
    const isStage1Registered = true;
    const isStage2Verified = business.verificationStatus !== VerificationStatus.UNVERIFIED;
    const isStage3Complete = completenessPercentage >= 70 && business.products.length >= 3;
    const isStage4Active = isStage3Complete && (business.updates.length > 0 || (business.lastConfirmedAt && new Date(business.lastConfirmedAt) >= sixtyDaysAgo(new Date()))) && business.viewsCount > 0;
    const isStage5Growing = isStage4Active && (totalInquiries >= 5 || business.contactClicksCount >= 5) && (business.products.length >= 5 || business.opportunities.length > 0);
    const isStage6Established = isStage5Growing && (business.verificationStatus === VerificationStatus.BUSINESS_VERIFIED || business.verificationStatus === VerificationStatus.HIGH_CONFIDENCE || business.verificationStatus === VerificationStatus.AGENT_VERIFIED) && (business.healthScore || 0) >= 70;

    let currentStageIndex = 0;
    if (isStage6Established) currentStageIndex = 5;
    else if (isStage5Growing) currentStageIndex = 4;
    else if (isStage4Active) currentStageIndex = 3;
    else if (isStage3Complete) currentStageIndex = 2;
    else if (isStage2Verified) currentStageIndex = 1;
    else currentStageIndex = 0;

    const journeyStages = [
      {
        stage: 1,
        key: "REGISTERED",
        name: "Registered",
        nameRw: "Kwandikwa",
        description: "Business profile created in the MOSA community directory.",
        descriptionRw: "Umwirondoro w'ubucuruzi wanditswe muri MOSA.",
        isCompleted: true,
        isCurrent: currentStageIndex === 0,
        nextStep: isStage2Verified ? null : "Schedule or complete in-person verification with a MOSA field agent.",
        nextStepRw: isStage2Verified ? null : "Gira gahunda yo gusurwa n'umukozi wa MOSA kugira ngo ubucuruzi bwemezwe ku mugaragaro.",
      },
      {
        stage: 2,
        key: "VERIFIED",
        name: "Verified",
        nameRw: "Kwemezwa",
        description: "Location and business identity confirmed on the ground.",
        descriptionRw: "Aho mukorera n'umwirondoro byemejwe n'abakozi b'akarere.",
        isCompleted: isStage2Verified,
        isCurrent: currentStageIndex === 1,
        nextStep: isStage3Complete ? null : "Complete full profile: add photos, working hours, and at least 3 items.",
        nextStepRw: isStage3Complete ? null : "Uzuza ibisabwa: shyiraho amafoto, amasaha y'akazi, n'ibicuruzwa nibura 3.",
      },
      {
        stage: 3,
        key: "COMPLETE",
        name: "Complete Profile",
        nameRw: "Gukwiza Ibisabwa",
        description: "Full menu/catalog, operating hours, and landmark published for discovery.",
        descriptionRw: "Ibicuruzwa, amasaha n'aho mugana byose byamaze gushyirwaho.",
        isCompleted: isStage3Complete,
        isCurrent: currentStageIndex === 2,
        nextStep: isStage4Active ? null : "Publish your first business update or confirm current catalog.",
        nextStepRw: isStage4Active ? null : "Tangaza itangazo rya mbere cyangwa wemeze ko ibiciro byawe bimeze neza.",
      },
      {
        stage: 4,
        key: "ACTIVE",
        name: "Active & Discoverable",
        nameRw: "Gukora Bifatika",
        description: "Consistently visible in neighborhood searches with up-to-date information.",
        descriptionRw: "Ubucuruzi bugaragara neza mu gushakisha kandi amakuru ahoraho agezweho.",
        isCompleted: isStage4Active,
        isCurrent: currentStageIndex === 3,
        nextStep: isStage5Growing ? null : "Engage customers: respond to WhatsApp inquiries and list catalog items or hiring opportunities.",
        nextStepRw: isStage5Growing ? null : "Subiza abakiriya kuri WhatsApp kandi wongereho ibicuruzwa cyangwa amatangazo y'akazi.",
      },
      {
        stage: 5,
        key: "GROWING",
        name: "Growing Business",
        nameRw: "Kwaguka",
        description: "Regular customer inquiries, expanded product catalog, and collaborative opportunities.",
        descriptionRw: "Abakiriya benshi bakubaza, ibicuruzwa byinshi, n'amahirwe mashya yo gukorana.",
        isCompleted: isStage5Growing,
        isCurrent: currentStageIndex === 4,
        nextStep: isStage6Established ? null : "Maintain top operational health score and community trust.",
        nextStepRw: isStage6Established ? null : "Komeza amanota meza yo kwizerwa n'ubuyobozi bw'abaturage.",
      },
      {
        stage: 6,
        key: "ESTABLISHED",
        name: "Established Pillar",
        nameRw: "Inkingi y'Ubucuruzi",
        description: "High-trust neighborhood anchor with verified track record and steady customer volume.",
        descriptionRw: "Ubucuruzi bw'icyitegererezo bwizewe mu gace, bufite abakiriya bahoraho.",
        isCompleted: isStage6Established,
        isCurrent: currentStageIndex === 5,
        nextStep: null,
        nextStepRw: null,
      },
    ];

    // 4. Products & Catalog Performance
    const totalProducts = business.products.length;
    const inStockProducts = business.products.filter((p) => p.isAvailable).length;

    return NextResponse.json({
      success: true,
      analytics: {
        viewsCount: business.viewsCount,
        contactClicksCount: business.contactClicksCount,
        searchAppearancesCount: business.searchCount,
        totalInquiries,
        inquiriesLast30Days,
        inquiriesLast7Days,
        breakdownByType,
        recentInquiries,
        totalProducts,
        inStockProducts,
        activeUpdatesCount: business.updates.length,
        openOpportunitiesCount: business.opportunities.length,
        totalApplicantInquiries: business.opportunities.reduce((acc, curr) => acc + (curr.inquiries?.length || 0), 0),
        healthScore: business.healthScore || 0,
        completenessPercentage,
        missingFields,
      },
      journey: {
        currentStage: journeyStages[currentStageIndex],
        currentStageIndex,
        stages: journeyStages,
      },
    });
  } catch (error) {
    console.error("[Owner Analytics GET Error]:", error);
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
  }
}

function sixtyDaysAgo(now: Date): Date {
  return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
}
