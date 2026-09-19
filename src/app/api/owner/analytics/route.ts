import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role, VerificationStatus } from "@prisma/client";

/**
 * GET /api/owner/analytics
 * Strictly Business-Owner Specific Progress, Telemetry & Operational Intelligence.
 * Enforces ownership at the database/server authorization level.
 * Never exposes competitor data, rankings, or platform-wide aggregates.
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
        select: { id: true, ownerId: true, community: true, cell: true },
      });

      if (!targetBiz) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 });
      }

      // Strict IDOR and Tenant Isolation
      if (auth.user.role === Role.BUSINESS_OWNER) {
        if (targetBiz.ownerId !== auth.user.id) {
          return NextResponse.json(
            { error: "Forbidden: Insecure direct object reference. You do not own this business." },
            { status: 403 }
          );
        }
      } else if (auth.user.role === Role.COMMUNITY_ADMIN) {
        if (
          auth.user.assignedCell &&
          targetBiz.cell !== auth.user.assignedCell &&
          targetBiz.community !== auth.user.community
        ) {
          return NextResponse.json(
            { error: "Forbidden: Business is outside your assigned administrative cell" },
            { status: 403 }
          );
        }
      }

      businessId = targetBiz.id;
    } else {
      // Default to the authenticated user's owned business
      const ownedBiz = await prisma.business.findFirst({
        where: { ownerId: auth.user.id },
        select: { id: true },
      });

      if (!ownedBiz) {
        return NextResponse.json({ error: "No business found for this owner account" }, { status: 404 });
      }

      businessId = ownedBiz.id;
    }

    // Authoritative fetch strictly for this specific business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        products: { where: { isArchived: false } },
        businessHours: true,
        updates: { orderBy: { createdAt: "desc" } },
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

    // 1. Customer Interaction Telemetry (Strictly for this business)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalInquiries, inquiriesLast30Days, inquiriesLast7Days, inquiriesByTypeRaw] = await Promise.all([
      prisma.customerInquiry.count({ where: { businessId } }),
      prisma.customerInquiry.count({ where: { businessId, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.customerInquiry.count({ where: { businessId, createdAt: { gte: sevenDaysAgo } } }),
      prisma.customerInquiry.groupBy({
        by: ["type"],
        where: { businessId },
        _count: { _all: true },
      }),
    ]);

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

    // Recent 10 customer inquiries (Safe event stream)
    const recentInquiries = business.inquiries.slice(0, 10).map((inq) => ({
      id: inq.id,
      type: inq.type,
      channel: inq.channel,
      itemName: inq.itemName,
      itemPrice: inq.itemPrice,
      createdAt: inq.createdAt.toISOString(),
    }));

    // Inquiries specifically tied to product/service discovery
    const productInquiriesCount = business.inquiries.filter((inq) => inq.productId || inq.itemName).length;

    // 2. Profile Completeness Audit (Checkpoints strictly for this business)
    const completedFields: { field: string; label: string; labelRw: string }[] = [];
    const missingFields: { field: string; label: string; labelRw: string; actionSection: string; actionSubtab?: string }[] = [];

    // Checkpoint 1: Description
    if (business.description && business.description.length >= 20) {
      completedFields.push({ field: "description", label: "Business description provided", labelRw: "Ibisobanuro by'ubucuruzi byashyizweho" });
    } else {
      missingFields.push({ field: "description", label: "Add detailed business description", labelRw: "Ongeraho ibisobanuro by'ubucuruzi", actionSection: "my_business" });
    }

    // Checkpoint 2: Cover image
    if (business.coverImage) {
      completedFields.push({ field: "coverImage", label: "Storefront cover photo uploaded", labelRw: "Ifoto y'imbere y'ubucuruzi yashyizweho" });
    } else {
      missingFields.push({ field: "coverImage", label: "Upload a storefront or banner cover photo", labelRw: "Ongeraho ifoto y'imbere cyangwa ibirango", actionSection: "content", actionSubtab: "photos" });
    }

    // Checkpoint 3: Gallery photos
    const photoCount = business.media.filter((m) => m.mediaType !== "VIDEO").length;
    const videoCount = business.media.filter((m) => m.mediaType === "VIDEO").length;
    if (photoCount >= 2) {
      completedFields.push({ field: "photos", label: `${photoCount} gallery photos uploaded`, labelRw: "Amafoto y'aho mukorera yarashyizweho" });
    } else {
      missingFields.push({ field: "photos", label: "Upload at least 2 gallery photos", labelRw: "Ongeraho amafoto nibura 2 y'aho mukorera", actionSection: "content", actionSubtab: "photos" });
    }

    // Checkpoint 4: Products/Services
    const totalProducts = business.products.length;
    const productsCount = business.products.filter((p) => !p.isService).length;
    const servicesCount = business.products.filter((p) => p.isService).length;
    const inStockCount = business.products.filter((p) => p.isAvailable).length;
    if (totalProducts >= 3) {
      completedFields.push({ field: "products", label: `${totalProducts} catalog items published`, labelRw: "Ibicuruzwa/serivisi byashyizweho" });
    } else {
      missingFields.push({ field: "products", label: "Add at least 3 products or services with pricing", labelRw: "Ongeraho ibicuruzwa cyangwa serivisi nibura 3 biriho ibiciro", actionSection: "catalog" });
    }

    // Checkpoint 5: Operating hours
    if (business.businessHours && business.businessHours.length > 0) {
      completedFields.push({ field: "businessHours", label: "Weekly operating hours configured", labelRw: "Amasaha y'akazi yarashyizweho" });
    } else {
      missingFields.push({ field: "businessHours", label: "Set weekly operating hours", labelRw: "Shyiraho amasaha y'akazi ya buri munsi", actionSection: "my_business" });
    }

    // Checkpoint 6: Location & Landmark
    if (business.nearestLandmark || business.streetName) {
      completedFields.push({ field: "location", label: "Street name and local landmark provided", labelRw: "Aho mukorera hazwi neza" });
    } else {
      missingFields.push({ field: "location", label: "Provide street name or nearby landmark for customer discovery", labelRw: "Tanga izina ry'umuhanda cyangwa ikimenyetso kizwi cyegereye", actionSection: "my_business" });
    }

    // Checkpoint 7: WhatsApp connection
    if (business.whatsapp) {
      completedFields.push({ field: "whatsapp", label: "WhatsApp connected for direct messaging", labelRw: "WhatsApp y'akazi irakora" });
    } else {
      missingFields.push({ field: "whatsapp", label: "Connect WhatsApp for fast customer direct messaging", labelRw: "Shyiraho numero ya WhatsApp y'akazi", actionSection: "my_business" });
    }

    // Checkpoint 8: Verification status
    const isVerified = business.verificationStatus !== VerificationStatus.UNVERIFIED;
    if (isVerified) {
      completedFields.push({ field: "verification", label: "Physical location verified by MOSA", labelRw: "Aho mukorera hemejwe n'umukozi wa MOSA" });
    } else {
      missingFields.push({ field: "verification", label: "Schedule physical verification with local MOSA agent", labelRw: "Gira gahunda yo kwemeza aho mukorera", actionSection: "overview" });
    }

    const totalAuditCheckpoints = 8;
    const completedCheckpoints = completedFields.length;
    const completenessPercentage = Math.round((completedCheckpoints / totalAuditCheckpoints) * 100);

    // 3. 6-Stage Business Milestone Journey (Strictly for this business)
    const isStage1Registered = true;
    const isStage2Verified = isVerified;
    const isStage3Complete = completenessPercentage >= 70 && totalProducts >= 3;
    const isStage4Active = isStage3Complete && (business.updates.length > 0 || (business.lastConfirmedAt && new Date(business.lastConfirmedAt) >= sixtyDaysAgo(new Date()))) && business.viewsCount > 0;
    const isStage5Growing = isStage4Active && (totalInquiries >= 5 || business.contactClicksCount >= 5) && (totalProducts >= 5 || business.opportunities.length > 0);
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
        description: "Your business profile is created in the MOSA community directory.",
        descriptionRw: "Umwirondoro w'ubucuruzi bwawe wanditswe muri MOSA.",
        isCompleted: true,
        isCurrent: currentStageIndex === 0,
        nextStep: isStage2Verified ? null : "Schedule or complete physical verification with a MOSA field agent.",
        nextStepRw: isStage2Verified ? null : "Gira gahunda yo gusurwa n'umukozi wa MOSA kugira ngo ubucuruzi bwemezwe ku mugaragaro.",
      },
      {
        stage: 2,
        key: "VERIFIED",
        name: "Verified Location",
        nameRw: "Kwemezwa Aho Mukorera",
        description: "Your physical location and identity are confirmed on the ground.",
        descriptionRw: "Aho mukorera n'umwirondoro byemejwe n'abakozi b'akarere.",
        isCompleted: isStage2Verified,
        isCurrent: currentStageIndex === 1,
        nextStep: isStage3Complete ? null : "Complete your profile: add photos, working hours, and at least 3 catalog items.",
        nextStepRw: isStage3Complete ? null : "Uzuza ibisabwa: shyiraho amafoto, amasaha y'akazi, n'ibicuruzwa nibura 3.",
      },
      {
        stage: 3,
        key: "COMPLETE",
        name: "Complete Profile",
        nameRw: "Gukwiza Ibisabwa",
        description: "Your full offerings, operating hours, and landmark are published for discovery.",
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
        description: "Your business is consistently discoverable in neighborhood searches with verified prices.",
        descriptionRw: "Ubucuruzi bwawe bugaragara neza mu gushakisha kandi amakuru ahoraho agezweho.",
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
        description: "Your business receives regular inquiries, broad catalog traffic, and commercial collaborations.",
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
        description: "Your business is a high-trust neighborhood anchor with verified track record and steady customer volume.",
        descriptionRw: "Ubucuruzi bw'icyitegererezo bwizewe mu gace, bufite abakiriya bahoraho.",
        isCompleted: isStage6Established,
        isCurrent: currentStageIndex === 5,
        nextStep: null,
        nextStepRw: null,
      },
    ];

    // 4. Personalized Improvement Recommendations (Strictly for this business)
    const recommendations: {
      id: string;
      priority: "HIGH" | "MEDIUM" | "LOW";
      title: string;
      titleRw: string;
      description: string;
      descriptionRw: string;
      actionLabel: string;
      actionLabelRw: string;
      actionSection: string;
      actionSubtab?: string;
    }[] = [];

    if (!isVerified) {
      recommendations.push({
        id: "rec_verify",
        priority: "HIGH",
        title: "Verify your physical location",
        titleRw: "Emeza aho ukorera ku mugaragaro",
        description: "Physical verification by a MOSA community agent awards your business the Verified Badge and improves local search visibility.",
        descriptionRw: "Iyo umukozi wa MOSA akusuye aho ukorera agaha ubucuruzi ikimenyetso cya Verified, byongera icyizere n'abakiriya.",
        actionLabel: "Request Verification",
        actionLabelRw: "Saba Kwemezwa",
        actionSection: "overview",
      });
    }

    if (photoCount < 2) {
      recommendations.push({
        id: "rec_photos",
        priority: "HIGH",
        title: "Add real photos of your storefront",
        titleRw: "Shyiraho amafoto y'aho mukorera",
        description: "Businesses with 2 or more real gallery photos receive up to 3x more WhatsApp clicks and direct inquiries.",
        descriptionRw: "Ubucuruzi bufite amafoto agaragaza ibicuruzwa n'aho mukorera bubona abakiriya benshi kuri WhatsApp.",
        actionLabel: "Upload Photos",
        actionLabelRw: "Ongeraho Amafoto",
        actionSection: "content",
        actionSubtab: "photos",
      });
    }

    if (totalProducts < 3) {
      recommendations.push({
        id: "rec_products",
        priority: "HIGH",
        title: "List at least 3 products or services with pricing",
        titleRw: "Shyiraho ibicuruzwa cyangwa serivisi nibura 3",
        description: "Clear pricing removes friction and allows nearby shoppers to immediately discover what you offer.",
        descriptionRw: "Gushyiraho ibiciro bifasha abakiriya kubona vuba ibyo mushobora kubaha.",
        actionLabel: "Add Catalog Items",
        actionLabelRw: "Ongeraho Ibicuruzwa",
        actionSection: "catalog",
      });
    }

    if (!business.whatsapp) {
      recommendations.push({
        id: "rec_whatsapp",
        priority: "HIGH",
        title: "Connect WhatsApp for instant customer chats",
        titleRw: "Huza WhatsApp y'ubucuruzi bwawe",
        description: "Over 70% of customer inquiries on MOSA occur via 1-click WhatsApp messaging.",
        descriptionRw: "Abakiriya barenga 70% bakoresha WhatsApp mu kubaza ibiciro n'amakuru y'ubucuruzi.",
        actionLabel: "Add WhatsApp",
        actionLabelRw: "Shyiraho WhatsApp",
        actionSection: "my_business",
      });
    }

    if (!business.businessHours || business.businessHours.length === 0) {
      recommendations.push({
        id: "rec_hours",
        priority: "MEDIUM",
        title: "Set weekly operating hours",
        titleRw: "Shyiraho amasaha y'akazi",
        description: "Let customers know whether you are currently open or closed when they find your profile.",
        descriptionRw: "Bwira abakiriya amasaha mufunguriraho n'ayo mufungiraho buri munsi.",
        actionLabel: "Set Hours",
        actionLabelRw: "Kora ku Masaha",
        actionSection: "my_business",
      });
    }

    if (business.updates.length === 0) {
      recommendations.push({
        id: "rec_update",
        priority: "MEDIUM",
        title: "Publish your first business update",
        titleRw: "Tangaza itangazo rya mbere ry'ubucuruzi",
        description: "Announce new arrivals, weekly discounts, or service updates to show customers your catalog is active.",
        descriptionRw: "Menyesha abaturanyi ibicuruzwa bishya cyangwa poromosiyo ufite ubu.",
        actionLabel: "Post Update",
        actionLabelRw: "Tangaza Amakuru",
        actionSection: "content",
        actionSubtab: "updates",
      });
    }

    const totalApplicantInquiries = business.opportunities.reduce(
      (acc, curr) => acc + (curr.inquiries?.length || 0),
      0
    );

    return NextResponse.json({
      success: true,
      businessId,
      businessName: business.name,
      // Comprehensive Owner Business Progress
      progress: {
        profileCompletion: {
          percentage: completenessPercentage,
          completedCount: completedCheckpoints,
          totalCheckpoints: totalAuditCheckpoints,
          missingFields,
          completedFields,
        },
        productsAndServices: {
          total: totalProducts,
          productsCount,
          servicesCount,
          inStockCount,
          productInquiriesCount,
        },
        photosAndVideos: {
          total: photoCount + videoCount,
          photoCount,
          videoCount,
          hasCoverImage: Boolean(business.coverImage),
        },
        businessUpdates: {
          total: business.updates.length,
          activeCount: business.updates.filter((u) => u.status === "ACTIVE").length,
          latestUpdate: business.updates[0]
            ? {
                id: business.updates[0].id,
                title: business.updates[0].title,
                createdAt: business.updates[0].createdAt.toISOString(),
              }
            : null,
        },
        profileViews: {
          profileViewsCount: business.viewsCount,
          searchAppearancesCount: business.searchCount,
          productInquiriesCount,
        },
        customerInteractions: {
          totalInquiries,
          inquiriesLast7Days,
          inquiriesLast30Days,
          breakdownByType,
          recentInquiries,
        },
        opportunities: {
          openCount: business.opportunities.length,
          totalResponses: totalApplicantInquiries,
        },
        milestones: {
          currentStage: journeyStages[currentStageIndex],
          currentStageIndex,
          stages: journeyStages,
        },
        recommendations,
      },
      // Flat analytics for direct existing UI bindings
      analytics: {
        viewsCount: business.viewsCount,
        contactClicksCount: business.contactClicksCount,
        searchAppearancesCount: business.searchCount,
        productInquiriesCount,
        totalInquiries,
        inquiriesLast30Days,
        inquiriesLast7Days,
        breakdownByType,
        recentInquiries,
        totalProducts,
        productsCount,
        servicesCount,
        inStockProducts: inStockCount,
        photoCount,
        videoCount,
        activeUpdatesCount: business.updates.filter((u) => u.status === "ACTIVE").length,
        openOpportunitiesCount: business.opportunities.length,
        totalApplicantInquiries,
        healthScore: business.healthScore || 0,
        completenessPercentage,
        missingFields,
        completedFields,
        recommendations,
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
