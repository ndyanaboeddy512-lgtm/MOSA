import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { VerificationStatus } from "@prisma/client";
import { formatBusinessRecord } from "@/lib/format-business";
import { serializePublicBusiness } from "@/lib/public-serializer";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        products: true,
        reviews: { orderBy: { createdAt: "desc" } },
        businessHours: true,
        media: true,
        verifications: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Approval Boundary: Non-active businesses are hidden from the public
    if (business.status !== "ACTIVE") {
      const user = await getCurrentUser();
      const isAuthorized = user && (
        user.id === business.ownerId ||
        user.role === "SUPER_ADMIN" ||
        user.role === "COMMUNITY_ADMIN"
      );
      if (!isAuthorized) {
        return NextResponse.json(
          { error: "Business not found or pending administrative verification" },
          { status: 404 }
        );
      }
    }

    // Increment views count asynchronously
    prisma.business
      .update({
        where: { id },
        data: { viewsCount: { increment: 1 } },
      })
      .catch(() => {});

    return NextResponse.json({ success: true, source: "postgres", business: serializePublicBusiness(business) });
  } catch (error) {
    console.error("[Business GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch business" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { action, status, userId, details, contactClick } = body;

    // Contact click tracking
    if (contactClick) {
      await prisma.business.update({
        where: { id },
        data: { contactClicksCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true });
    }

    // Verification update action
    if (action === "VERIFY" && status) {
      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.business.update({
          where: { id },
          data: {
            verificationStatus: status as VerificationStatus,
          },
        });

        if (user) {
          await tx.verificationRecord.create({
            data: {
              businessId: id,
              userId: user.id,
              type: status,
              notes: details?.notes || "Verification audit executed",
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "BUSINESS_VERIFIED",
              entityType: "BUSINESS",
              entityId: id,
              metadata: JSON.stringify({ newStatus: status, notes: details?.notes }),
            },
          });
        }
        return b;
      });

      return NextResponse.json({ success: true, business: formatBusinessRecord(updated) });
    }

    // Business claim action by owner
    if (action === "CLAIM") {
      const claimUserId = user?.id || userId;
      if (!claimUserId) {
        return NextResponse.json({ error: "User authentication required to claim business" }, { status: 401 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.business.update({
          where: { id },
          data: {
            ownerId: claimUserId,
            isClaimed: true,
            claimedAt: new Date(),
            verificationStatus: VerificationStatus.BUSINESS_VERIFIED,
          },
        });

        await tx.businessClaim.create({
          data: {
            businessId: id,
            userId: claimUserId,
            claimPhone: user?.phone || "+250788000000",
            status: "APPROVED",
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: claimUserId,
            action: "BUSINESS_CLAIMED",
            entityType: "BUSINESS",
            entityId: id,
          },
        });

        return b;
      });

      return NextResponse.json({ success: true, business: formatBusinessRecord(updated) });
    }

    // Business location update / re-verification action
    if (action === "UPDATE_LOCATION") {
      const {
        latitude,
        longitude,
        nearestLandmark,
        streetName,
        nearbyPlace,
        locationDescription,
        locationSource,
        locationAccuracy,
        locationVerificationStatus,
        sector,
        cell,
        district,
        addressNote,
      } = body;

      const updateData: any = {};
      if (typeof latitude === "number") updateData.latitude = latitude;
      if (typeof longitude === "number") updateData.longitude = longitude;
      if (nearestLandmark !== undefined) updateData.nearestLandmark = nearestLandmark;
      if (streetName !== undefined) updateData.streetName = streetName;
      if (nearbyPlace !== undefined) updateData.nearbyPlace = nearbyPlace;
      if (locationDescription !== undefined) updateData.locationDescription = locationDescription;
      if (locationSource) updateData.locationSource = locationSource;
      if (typeof locationAccuracy === "number") updateData.locationAccuracy = locationAccuracy;
      if (locationVerificationStatus) updateData.locationVerificationStatus = locationVerificationStatus;
      if (sector) updateData.sector = sector;
      if (cell) updateData.cell = cell;
      if (district) updateData.district = district;
      if (addressNote) updateData.addressNote = addressNote;

      if (user) {
        if (locationAccuracy || locationSource === "GPS_DEVICE") {
          updateData.locationCapturedById = user.id;
          updateData.locationCapturedAt = new Date();
        }
        if (user.role === "COMMUNITY_AGENT" || user.role === "SUPER_ADMIN" || user.role === "COMMUNITY_ADMIN") {
          updateData.locationVerifiedById = user.id;
          updateData.locationVerifiedAt = new Date();
        }
      }

      updateData.updatedAt = new Date();

      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.business.update({
          where: { id },
          data: updateData,
          include: { products: true, localArea: true },
        });

        if (user) {
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "BUSINESS_LOCATION_UPDATED",
              entityType: "BUSINESS",
              entityId: id,
              metadata: JSON.stringify({
                latitude: b.latitude,
                longitude: b.longitude,
                nearestLandmark: b.nearestLandmark,
                accuracy: b.locationAccuracy,
                verificationStatus: b.locationVerificationStatus,
              }),
            },
          });
        }
        return b;
      });

      return NextResponse.json({ success: true, business: formatBusinessRecord(updated) });
    }

    return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 });
  } catch (error) {
    console.error("[Business Update Error]:", error);
    return NextResponse.json({ error: "Failed to update business" }, { status: 500 });
  }
}
