import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role, PriceType } from "@prisma/client";
import { calculateAndPersistBusinessHealth } from "@/lib/business-health";
import { sendBusinessSMS } from "@/lib/sms";
import { logAuditEvent } from "@/lib/audit";

/**
 * POST /api/owner/products
 * Adds a new product/service to the owner's catalogue.
 */
export async function POST(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const {
      businessId,
      name,
      nameRw,
      description,
      price,
      priceMin,
      priceMax,
      priceType = "FIXED",
      unit = "service",
      category,
      isAvailable = true,
      isEstimated = false,
    } = body;

    if (!businessId || !name) {
      return NextResponse.json({ error: "businessId and name are required" }, { status: 400 });
    }

    // Verify ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, ownerId: true, phone: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    const actorId = auth.user.id;

    // Determine normalized priceType
    const normPriceType = (priceType as PriceType) || (priceMin && priceMax ? "RANGE" : (isEstimated ? "ESTIMATED" : "FIXED"));

    // Create Product and Audit History atomically in Neon PostgreSQL
    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          businessId,
          name: name.trim(),
          nameRw: nameRw?.trim() || null,
          description: description?.trim() || null,
          price: Number(price) || (Number(priceMin) || 0),
          priceMin: priceMin !== undefined ? Number(priceMin) : null,
          priceMax: priceMax !== undefined ? Number(priceMax) : null,
          priceType: normPriceType,
          unit: unit || "item",
          category: category || null,
          isAvailable: Boolean(isAvailable),
          isEstimated: Boolean(isEstimated || normPriceType === "ESTIMATED" || normPriceType === "RANGE"),
          isService: Boolean(body.isService),
          dataStatus: "VERIFIED",
        },
      });

      await tx.businessChangeHistory.create({
        data: {
          businessId,
          productId: p.id,
          actorId,
          action: "PRODUCT_ADDED",
          fieldChanged: "product",
          previousValue: null,
          newValue: `${p.name} (${p.price} RWF)`,
          approvalStatus: "APPROVED",
          source: "OWNER_DASHBOARD",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "PRODUCT_CREATED",
          entityType: "PRODUCT",
          entityId: p.id,
          metadata: JSON.stringify({ businessId, name: p.name, price: p.price }),
        },
      });

      return p;
    });

    // Revalidate Public Website Cache
    revalidatePath(`/business/${businessId}`);
    revalidatePath("/explore");

    // Recalculate health score
    const health = await calculateAndPersistBusinessHealth(businessId);

    return NextResponse.json({
      success: true,
      product,
      health,
    });
  } catch (error) {
    console.error("[Owner Product POST Error]:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

/**
 * PATCH /api/owner/products
 * Updates an existing product (e.g. price change 3,000 -> 3,500 RWF).
 * Fully synchronized: changes database, creates audit history, sends SMS notification, and revalidates public page.
 */
export async function PATCH(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const { productId: _p, id: _i, businessId: _b, ...fields } = body;
    const productId = body.productId || body.id;
    let businessId = body.businessId;

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    if (!businessId) {
      const prod = await prisma.product.findUnique({
        where: { id: productId },
        select: { businessId: true },
      });
      if (prod) businessId = prod.businessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required or could not be determined" }, { status: 400 });
    }

    // Verify ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, ownerId: true, phone: true },
    });

    if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct || existingProduct.businessId !== businessId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const actorId = auth.user.id;

    // Build update object
    const updateData: any = {};
    const priceChanged = fields.price !== undefined && Number(fields.price) !== existingProduct.price;

    if (fields.name !== undefined) updateData.name = fields.name.trim();
    if (fields.nameRw !== undefined) updateData.nameRw = fields.nameRw?.trim() || null;
    if (fields.description !== undefined) updateData.description = fields.description?.trim() || null;
    if (fields.price !== undefined) updateData.price = Number(fields.price);
    if (fields.priceMin !== undefined) updateData.priceMin = Number(fields.priceMin);
    if (fields.priceMax !== undefined) updateData.priceMax = Number(fields.priceMax);
    if (fields.priceType !== undefined) updateData.priceType = fields.priceType as PriceType;
    if (fields.unit !== undefined) updateData.unit = fields.unit;
    if (fields.category !== undefined) updateData.category = fields.category;
    if (fields.isAvailable !== undefined) updateData.isAvailable = Boolean(fields.isAvailable);
    if (fields.isEstimated !== undefined) updateData.isEstimated = Boolean(fields.isEstimated);
    if (fields.isService !== undefined) updateData.isService = Boolean(fields.isService);
    if (fields.sortOrder !== undefined) updateData.sortOrder = Number(fields.sortOrder);
    if (fields.isArchived !== undefined) updateData.isArchived = Boolean(fields.isArchived);

    updateData.updatedAt = new Date();

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const up = await tx.product.update({
        where: { id: productId },
        data: updateData,
      });

      if (priceChanged) {
        await tx.businessChangeHistory.create({
          data: {
            businessId,
            productId,
            actorId,
            action: "PRICE_CHANGED",
            fieldChanged: "price",
            previousValue: `${existingProduct.price} RWF`,
            newValue: `${up.price} RWF`,
            approvalStatus: "APPROVED",
            source: "OWNER_DASHBOARD",
            metadata: JSON.stringify({
              productName: up.name,
              oldPrice: existingProduct.price,
              newPrice: up.price,
            }),
          },
        });

        await tx.auditLog.create({
          data: {
            actorId,
            action: "PRODUCT_PRICE_UPDATED",
            entityType: "PRODUCT",
            entityId: up.id,
            metadata: JSON.stringify({ businessId, oldPrice: existingProduct.price, newPrice: up.price }),
          },
        });
      } else {
        await tx.businessChangeHistory.create({
          data: {
            businessId,
            productId,
            actorId,
            action: "PRODUCT_EDITED",
            fieldChanged: Object.keys(updateData).join(", "),
            previousValue: existingProduct.name,
            newValue: up.name,
            approvalStatus: "APPROVED",
            source: "OWNER_DASHBOARD",
          },
        });

        await tx.auditLog.create({
          data: {
            actorId,
            action: "PRODUCT_EDITED",
            entityType: "PRODUCT",
            entityId: up.id,
            metadata: JSON.stringify({ businessId, updatedFields: Object.keys(updateData) }),
          },
        });
      }

      return up;
    });

    // Dispatch SMS event for price update if price changed
    if (priceChanged && business.phone) {
      await sendBusinessSMS({
        businessId,
        recipientPhone: business.phone,
        templateId: "UPDATE_SUCCESS",
        language: (auth.user.language as any) || "rw",
        variables: {
          businessName: business.name,
          itemName: updatedProduct.name,
          price: updatedProduct.price,
        },
      }).catch(() => {});
    }

    // Revalidate Public Website Cache
    revalidatePath(`/business/${businessId}`);
    revalidatePath("/explore");

    const health = await calculateAndPersistBusinessHealth(businessId);

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      health,
    });
  } catch (error) {
    console.error("[Owner Product PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

/**
 * DELETE /api/owner/products
 * Archives or removes a product from the catalogue.
 */
export async function DELETE(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const businessId = searchParams.get("businessId");

    if (!productId || !businessId) {
      return NextResponse.json({ error: "productId and businessId are required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, businessId: true, name: true },
    });

    if (!existingProduct || existingProduct.businessId !== businessId) {
      return NextResponse.json({ error: "Product not found or does not belong to this business" }, { status: 404 });
    }

    const actorId = auth.user.id;

    // Soft-archive product and record audit atomically
    const archived = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: productId },
        data: { isArchived: true, isAvailable: false },
      });

      await tx.businessChangeHistory.create({
        data: {
          businessId,
          productId,
          actorId,
          action: "PRODUCT_ARCHIVED",
          fieldChanged: "isArchived",
          previousValue: "active",
          newValue: "archived",
          approvalStatus: "APPROVED",
          source: "OWNER_DASHBOARD",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "PRODUCT_ARCHIVED",
          entityType: "PRODUCT",
          entityId: p.id,
          metadata: JSON.stringify({ businessId, name: p.name }),
        },
      });

      return p;
    });

    revalidatePath(`/business/${businessId}`);
    revalidatePath("/explore");

    const health = await calculateAndPersistBusinessHealth(businessId);

    return NextResponse.json({ success: true, archivedId: archived.id, health });
  } catch (error) {
    console.error("[Owner Product DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
