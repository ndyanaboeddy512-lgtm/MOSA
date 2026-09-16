import { NextResponse } from "next/server";
import { parsePhysicalDocument, sanitizeReceiptText } from "@/lib/ocr";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { DocumentType, ExtractionStatus } from "@prisma/client";

function mapDocType(type?: string): DocumentType {
  switch (type?.toUpperCase()) {
    case "MENU":
      return DocumentType.MENU;
    case "PRICE_BOARD":
      return DocumentType.PRICE_BOARD;
    case "STOREFRONT_SIGN":
      return DocumentType.STOREFRONT_SIGN;
    case "RECEIPT":
    default:
      return DocumentType.RECEIPT;
  }
}

// GET /api/capture/ocr - List recent physical captures
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const agentId = searchParams.get("agentId");

    const where: any = {};
    if (businessId) where.businessId = businessId;
    if (agentId) where.agentId = agentId;

    const captures = await prisma.receiptCapture.findMany({
      where,
      include: {
        items: true,
        business: {
          select: { id: true, name: true, cell: true, sector: true },
        },
        agent: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { uploadedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, count: captures.length, captures });
  } catch (error) {
    console.warn("[Captures GET DB Fallback]:", error);
    return NextResponse.json({ success: true, count: 0, captures: [] });
  }
}

// POST /api/capture/ocr - Parse raw OCR text or publish physical capture with line items
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      action = "parse",
      rawText, 
      documentType = "RECEIPT",
      businessId,
      items,
      merchantName,
      totalAmount,
      imageUrl = "https://images.unsplash.com/photo-1554415707-9e4466aef152?w=800&auto=format&fit=crop&q=60"
    } = body;

    // Mode 1: Pure parsing of text
    if (action === "parse" && !items) {
      if (!rawText) {
        return NextResponse.json({ error: "Missing rawText in request body" }, { status: 400 });
      }

      const ocrType = (documentType === "RECEIPT" || documentType === "MENU" || documentType === "PRICE_BOARD" || documentType === "STOREFRONT_SIGN")
        ? documentType
        : "RECEIPT";

      const result = parsePhysicalDocument(rawText, ocrType);
      return NextResponse.json({ success: true, result });
    }

    // Mode 2: Persist capture record and publish line items to PostgreSQL
    const currentUser = await getCurrentUser();
    let agentId = currentUser?.id;

    if (!agentId) {
      // Fallback to active agent in database
      const defaultAgent = await prisma.user.findFirst({
        where: { role: "COMMUNITY_AGENT" },
      });
      agentId = defaultAgent?.id;
    }

    if (!agentId) {
      // Create or upsert default community agent if none exists
      const agent = await prisma.user.upsert({
        where: { phone: "+250788000003" },
        update: {},
        create: {
          phone: "+250788000003",
          name: "Emmanuel Hakizimana",
          role: "COMMUNITY_AGENT",
          community: "Biryogo",
          referralCode: "MOSA-BIR-77",
          points: 420,
          badges: ["Certified Agent", "Local Scout"],
        },
      });
      agentId = agent.id;
    }

    const docTypeEnum = mapDocType(documentType);
    const sanitizedOcr = rawText ? sanitizeReceiptText(rawText).text : "";

    // Create ReceiptCapture in PostgreSQL
    const capture = await prisma.receiptCapture.create({
      data: {
        businessId: businessId || null,
        agentId: agentId,
        documentType: docTypeEnum,
        imageUrl,
        rawOcrText: sanitizedOcr,
        merchantDetected: merchantName || "Local Merchant",
        totalAmount: totalAmount ? Number(totalAmount) : null,
        currency: "RWF",
        status: ExtractionStatus.VERIFIED,
        sanitized: true,
        verifiedAt: new Date(),
        items: items && Array.isArray(items)
          ? {
              create: items.map((item: any) => ({
                name: item.name,
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 1,
                category: item.category || "General",
                confidence: Number(item.confidence) || 0.95,
              })),
            }
          : undefined,
      },
      include: {
        items: true,
      },
    });

    // If target business is specified and items are present, also publish into the Business Product catalog
    if (businessId && capture.items && capture.items.length > 0) {
      for (const item of capture.items) {
        await prisma.product.create({
          data: {
            businessId,
            name: item.name,
            price: item.price,
            currency: "RWF",
            category: item.category || "General",
            extractedFrom: docTypeEnum,
            confidenceScore: item.confidence,
            verifiedByAgent: true,
            receiptItemId: item.id,
          },
        }).catch((err) => {
          console.warn("[Product Create from Capture Warning]:", err);
        });
      }

      // Add agent reward points for capturing verified data
      await prisma.user.update({
        where: { id: agentId },
        data: {
          points: { increment: 25 },
        },
      }).catch(() => {});
    }

    // Record audit log
    await logAuditEvent({
      actorId: agentId,
      action: "PHYSICAL_DOCUMENT_CAPTURED",
      entityType: "RECEIPT_CAPTURE",
      entityId: capture.id,
      metadata: {
        documentType: docTypeEnum,
        businessId,
        itemsCount: capture.items?.length || 0,
        totalAmount,
      },
    });

    return NextResponse.json({
      success: true,
      captureId: capture.id,
      capture,
    }, { status: 201 });
  } catch (error) {
    console.error("[OCR Capture POST Error]:", error);
    return NextResponse.json({ error: "Failed to process and store capture" }, { status: 500 });
  }
}
