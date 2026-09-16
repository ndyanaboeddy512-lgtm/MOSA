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

    // Determine normalized priceType
    const normPriceType = (priceType as PriceType) || (priceMin && priceMax ? "RANGE" : (isEstimated ? "ESTIMATED" : "FIXED"));

    // Create Product in Neon PostgreSQL
    const product = await prisma.product.create({
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
        dataStatus: "VERIFIED",
      },
    });

    // Record in BusinessChangeHistory
    await prisma.businessChangeHistory.create({
      data: {
        businessId,
        productId: product.id,
        actorId: auth.user.id,
        action: "PRODUCT_ADDED",
        fieldChanged: "product",
        previousValue: null,
        newValue: `${product.name} (${product.price} RWF)`,
        approvalStatus: "APPROVED",
        source: "OWNER_DASHBOARD",
      },
    });

    await logAuditEvent({
      actorId: auth.user.id,
      action: "PRODUCT_CREATED",
      entityType: "PRODUCT",
      entityId: product.id,
      metadata: { businessId, name: product.name, price: product.price },
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

    // Build update object
    const updateData: any = {};
    const priceChanged = fields.price !== undefined && Number(fields.price) !== existingProduct.price;

    if (fields.name !== undefined) updateData.name = fields.name.trim();
    if (fields.nameRw !== undefined) updateData.nameRw = fields.nameRw.trim();
    if (fields.description !== undefined) updateData.description = fields.description.trim();
    if (fields.price !== undefined) updateData.price = Number(fields.price);
    if (fields.priceMin !== undefined) updateData.priceMin = fields.priceMin !== null ? Number(fields.priceMin) : null;
    if (fields.priceMax !== undefined) updateData.priceMax = fields.priceMax !== null ? Number(fields.priceMax) : null;
    if (fields.priceType !== undefined) updateData.priceType = fields.priceType as PriceType;
    if (fields.unit !== undefined) updateData.unit = fields.unit;
    if (fields.category !== undefined) updateData.category = fields.category;
    if (fields.isAvailable !== undefined) updateData.isAvailable = Boolean(fields.isAvailable);
    if (fields.isEstimated !== undefined) updateData.isEstimated = Boolean(fields.isEstimated);
    if (fields.sortOrder !== undefined) updateData.sortOrder = Number(fields.sortOrder);
    if (fields.isArchived !== undefined) updateData.isArchived = Boolean(fields.isArchived);

    updateData.updatedAt = new Date();

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    // Record in BusinessChangeHistory
    if (priceChanged) {
      await prisma.businessChangeHistory.create({
        data: {
          businessId,
          productId,
          actorId: auth.user.id,
          action: "PRICE_CHANGED",
          fieldChanged: "price",
          previousValue: `${existingProduct.price} RWF`,
          newValue: `${updatedProduct.price} RWF`,
          approvalStatus: "APPROVED",
          source: "OWNER_DASHBOARD",
          metadata: JSON.stringify({
            productName: updatedProduct.name,
            oldPrice: existingProduct.price,
            newPrice: updatedProduct.price,
          }),
        },
      });

      // Dispatch SMS event for price update
      if (business.phone) {
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
    } else {
      await prisma.businessChangeHistory.create({
        data: {
          businessId,
          productId,
          actorId: auth.user.id,
          action: "PRODUCT_EDITED",
          fieldChanged: Object.keys(updateData).join(", "),
          previousValue: existingProduct.name,
          newValue: updatedProduct.name,
          approvalStatus: "APPROVED",
          source: "OWNER_DASHBOARD",
        },
      });
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

    // Soft-archive product
    const archived = await prisma.product.update({
      where: { id: productId },
      data: { isArchived: true, isAvailable: false },
    });

    await prisma.businessChangeHistory.create({
      data: {
        businessId,
        productId,
        actorId: auth.user.id,
        action: "PRODUCT_ARCHIVED",
        fieldChanged: "isArchived",
        previousValue: "active",
        newValue: "archived",
        approvalStatus: "APPROVED",
        source: "OWNER_DASHBOARD",
      },
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
