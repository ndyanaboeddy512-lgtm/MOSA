import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeRwandaPhone } from "@/lib/sms/normalize";
import { createSessionToken, setSessionCookie, hashPassword } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { sendBusinessSMS } from "@/lib/sms";
import { Role, LocationSource, LocationVerificationStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      nameRw,
      category,
      categoryDisplay,
      categoryDisplayRw,
      description,
      descriptionRw,
      ownerName,
      phone,
      whatsapp,
      password,
      province = "Kigali City",
      district = "Nyarugenge",
      sector,
      cell,
      localArea,
      nearestLandmark,
      streetName,
      nearbyPlace,
      locationDescription,
      latitude,
      longitude,
      locationAccuracy,
      products = [],
    } = body;

    // 1. Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "Business category is required" }, { status: 400 });
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Owner phone number is required" }, { status: 400 });
    }

    // 2. Normalize Rwanda Phone Number
    const phoneNorm = normalizeRwandaPhone(phone);
    if (!phoneNorm.isValid || !phoneNorm.e164) {
      return NextResponse.json(
        { error: phoneNorm.error || "Invalid Rwandan phone number. Enter a valid MTN (078/079) or Airtel (072/073) number." },
        { status: 400 }
      );
    }
    const cleanPhone = phoneNorm.e164;

    // Optional WhatsApp normalization
    let cleanWhatsapp: string | null = null;
    if (whatsapp && typeof whatsapp === "string" && whatsapp.trim()) {
      const waNorm = normalizeRwandaPhone(whatsapp);
      cleanWhatsapp = waNorm.isValid && waNorm.e164 ? waNorm.e164 : cleanPhone;
    } else {
      cleanWhatsapp = cleanPhone;
    }

    const hasCoordinates = typeof latitude === "number" && typeof longitude === "number" && !isNaN(latitude) && !isNaN(longitude);
    const hasGps = hasCoordinates && typeof locationAccuracy === "number";
    const locSource: LocationSource = hasGps ? LocationSource.GPS_DEVICE : LocationSource.OWNER_REPORTED;
    const locVerification: LocationVerificationStatus = hasGps ? LocationVerificationStatus.AGENT_CAPTURED : LocationVerificationStatus.UNVERIFIED;
    const accuracy = hasGps ? Number(locationAccuracy) : null;
    const resolvedProvinceId = body.provinceId || null;
    const resolvedDistrictId = body.districtId || null;
    const resolvedSectorId = body.sectorId || null;
    const resolvedCellId = body.cellId || null;

    // 3-7. Atomic Transaction: User Account + Business + Products + AuditLog
      const { user, business } = await prisma.$transaction(async (tx) => {
      let u = await tx.user.findUnique({
        where: { phone: cleanPhone },
      });

      if (u) {
        if (u.role === Role.CUSTOMER) {
          u = await tx.user.update({
            where: { id: u.id },
            data: { 
              role: Role.BUSINESS_OWNER,
              language: body.preferredLanguage || u.language || "rw",
            },
          });
        }
      } else {
        const effectivePassword = password && password.length >= 6 ? password : `Mosa@${cleanPhone.slice(-4)}`;
        const passwordHash = await hashPassword(effectivePassword);

        u = await tx.user.create({
          data: {
            phone: cleanPhone,
            name: ownerName && ownerName.trim() ? ownerName.trim() : `${name.trim()} Owner`,
            role: Role.BUSINESS_OWNER,
            passwordHash,
            community: sector || "Kigali",
            language: body.preferredLanguage || "rw",
            status: "ACTIVE",
            referralCode: `MOSA-${cleanPhone.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
          },
        });
      }

      const b = await tx.business.create({
        data: {
          name: name.trim(),
          nameRw: nameRw?.trim() || name.trim(),
          category: category.trim(),
          categoryDisplay: categoryDisplay || "Local Business",
          categoryDisplayRw: categoryDisplayRw || "Ubucuruzi bw'Agace",
          subCategory: body.subCategory?.trim() || null,
          description: description?.trim() || "Neighborhood micro-business registered directly on MOSA.",
          descriptionRw: descriptionRw?.trim() || description?.trim() || "Ubucuruzi bw'agace bwanditswe kuri MOSA.",
          phone: cleanPhone,
          whatsapp: cleanWhatsapp,
          ownerId: u.id,
          sector: sector?.trim() || "Nyamirambo",
          cell: cell?.trim() || "Biryogo",
          district: district?.trim() || "Nyarugenge",
          addressNote: localArea?.trim() || null,
          nearestLandmark: nearestLandmark?.trim() || null,
          streetName: streetName?.trim() || null,
          nearbyPlace: nearbyPlace?.trim() || null,
          locationDescription: locationDescription?.trim() || null,
          locationSource: locSource,
          locationAccuracy: hasGps ? accuracy : null,
          locationVerificationStatus: locVerification,
          latitude: hasCoordinates ? Number(latitude) : -1.981,
          longitude: hasCoordinates ? Number(longitude) : 30.046,
          verificationStatus: "UNVERIFIED",
          status: "PENDING",
          dataStatus: "VERIFIED",
          source: "SELF_REGISTERED",
          provinceId: resolvedProvinceId,
          districtId: resolvedDistrictId,
          sectorId: resolvedSectorId,
          cellId: resolvedCellId,
          coverImage: body.coverImage || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60",
        },
      });

      // Opening hours if provided
      if (body.openingHours && Array.isArray(body.openingHours) && body.openingHours.length > 0) {
        for (const h of body.openingHours) {
          if (h.day) {
            await tx.businessHour.create({
              data: {
                businessId: b.id,
                day: h.day,
                dayRw: h.dayRw || h.day,
                open: h.open || "08:00",
                close: h.close || "20:00",
                isClosed: Boolean(h.isClosed),
              },
            });
          }
        }
      }

      if (products && Array.isArray(products) && products.length > 0) {
        for (const p of products) {
          if (p.name && p.name.trim()) {
            const itemPrice = Number(p.price) || 0;
            const minP = p.priceMin !== undefined ? Number(p.priceMin) : itemPrice;
            const maxP = p.priceMax !== undefined ? Number(p.priceMax) : itemPrice;
            await tx.product.create({
              data: {
                businessId: b.id,
                name: p.name.trim(),
                nameRw: p.nameRw?.trim() || p.name.trim(),
                description: p.description?.trim() || null,
                unit: p.unit || "item",
                price: itemPrice,
                priceMin: minP,
                priceMax: maxP,
                priceType: p.priceType || (minP !== maxP ? "RANGE" : "FIXED"),
                category: p.category || b.category,
                isAvailable: true,
              },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: u.id,
          action: "BUSINESS_SELF_REGISTERED",
          entityType: "BUSINESS",
          entityId: b.id,
          metadata: JSON.stringify({
            name: b.name,
            category: b.category,
            phone: u.phone,
            sector: b.sector,
            cell: b.cell,
            hasGps,
            initialStatus: "PENDING",
          }),
        },
      });

      return { user: u, business: b };
    });

    // 9. Generate and persist authenticated session token for the owner
    const token = await createSessionToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name,
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await setSessionCookie(token);

    // 10. Truthful Welcome SMS Notification
    try {
      await sendBusinessSMS({
        businessId: business.id,
        recipientPhone: cleanPhone,
        templateId: "WELCOME_OWNER",
        variables: {
          businessName: business.name,
          dashboardUrl: "https://mosa-one.vercel.app/owner/dashboard",
        },
        language: "rw",
      });
    } catch {
      // Non-blocking: SMS gateway configuration is handled gracefully
    }

    return NextResponse.json(
      {
        success: true,
        message: "Business registered successfully and pending administrative verification",
        businessId: business.id,
        business: {
          id: business.id,
          name: business.name,
          status: business.status,
        },
        redirectUrl: "/owner/dashboard",
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Business Self-Registration Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register business. Please try again." },
      { status: 500 }
    );
  }
}
