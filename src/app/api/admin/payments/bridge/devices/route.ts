import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createDevicePairingChallenge,
  revokeBridgeDevice,
  rotateBridgeDeviceCredentials,
} from "@/lib/payments/bridge-devices";
import { updatePaymentProviderConfig, getPaymentProviders } from "@/lib/payments/engine";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || !["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access to bridge device management." },
        { status: 403 }
      );
    }

    const devices = await prisma.paymentBridgeDevice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        enrolledBy: {
          select: { id: true, name: true, email: true },
        },
        revokedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Mask sensitive tokens in listing response
    const sanitizedDevices = devices.map((d) => ({
      id: d.id,
      name: d.name,
      deviceId: d.deviceId,
      simPhoneNumber: d.simPhoneNumber,
      carrier: d.carrier,
      status: d.status,
      batteryLevel: d.batteryLevel,
      isCharging: d.isCharging,
      networkType: d.networkType,
      appVersion: d.appVersion,
      pairingCode: d.status === "PENDING_PAIRING" ? d.pairingCode : undefined,
      pairingExpiresAt: d.status === "PENDING_PAIRING" ? d.pairingExpiresAt : undefined,
      lastHeartbeatAt: d.lastHeartbeatAt,
      lastSyncAt: d.lastSyncAt,
      enrolledAt: d.enrolledAt,
      enrolledBy: d.enrolledBy,
      revokedAt: d.revokedAt,
      revokedBy: d.revokedBy,
      revokedReason: d.revokedReason,
      createdAt: d.createdAt,
    }));

    // Fetch payment destinations / provider configurations (receiving accounts/SIMs)
    const providers = await getPaymentProviders(false);

    // Fetch recent audit logs for payment bridge and destinations
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: {
          in: ["PaymentBridgeDevice", "PaymentProviderConfig", "RegistrationFeeConfig"],
        },
      },
      include: {
        actor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({
      success: true,
      serverUrl: process.env.NEXT_PUBLIC_APP_URL || "https://mosa-one.vercel.app",
      devices: sanitizedDevices,
      totalCount: sanitizedDevices.length,
      activeCount: sanitizedDevices.filter((d) => d.status === "ACTIVE").length,
      providers,
      auditLogs,
    });
  } catch (error: any) {
    console.error("[BRIDGE_DEVICES_GET_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load bridge devices." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || !["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === "CREATE_PAIRING") {
      const { name, simPhoneNumber, carrier, expiryMinutes } = body;
      const challenge = await createDevicePairingChallenge({
        name,
        simPhoneNumber,
        carrier,
        adminId: currentUser.id,
        expiryMinutes: expiryMinutes ? Number(expiryMinutes) : undefined,
      });

      const expiryText = challenge.pairingExpiresAt
        ? `expires at ${challenge.pairingExpiresAt.toLocaleTimeString()}`
        : "expires in 15 minutes";

      return NextResponse.json({
        success: true,
        message: `Pairing challenge generated for "${challenge.name}". Code ${expiryText}.`,
        challenge,
      });
    }

    if (action === "EXPIRE_PAIRING") {
      const { deviceId } = body;
      if (!deviceId) {
        return NextResponse.json(
          { success: false, error: "Device identifier (deviceId) is required." },
          { status: 400 }
        );
      }

      const device = await prisma.paymentBridgeDevice.findUnique({
        where: { deviceId },
      });

      if (!device) {
        return NextResponse.json(
          { success: false, error: `Device "${deviceId}" not found.` },
          { status: 404 }
        );
      }

      const updated = await prisma.paymentBridgeDevice.update({
        where: { id: device.id },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedById: currentUser.id,
          revokedReason: "Pairing challenge expired/canceled by administrator.",
          pairingCode: null,
          pairingExpiresAt: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: currentUser.id,
          action: "BRIDGE_PAIRING_CODE_EXPIRED_BY_ADMIN",
          entityType: "PaymentBridgeDevice",
          entityId: updated.id,
          metadata: JSON.stringify({
            deviceId: updated.deviceId,
            name: updated.name,
            canceledAt: new Date().toISOString(),
          }),
        },
      }).catch(() => null);

      return NextResponse.json({
        success: true,
        message: `Pairing code for "${updated.name}" has been canceled.`,
        device: updated,
      });
    }

    if (action === "REVOKE_DEVICE") {
      const { deviceId, reason } = body;
      if (!deviceId) {
        return NextResponse.json(
          { success: false, error: "Device identifier (deviceId) is required to revoke." },
          { status: 400 }
        );
      }

      const revoked = await revokeBridgeDevice({
        deviceId,
        adminId: currentUser.id,
        reason: reason || "Revoked by Administrator from Command Center",
      });

      return NextResponse.json({
        success: true,
        message: `Device "${revoked.name}" (${revoked.deviceId}) was permanently revoked.`,
        device: {
          deviceId: revoked.deviceId,
          status: revoked.status,
          revokedAt: revoked.revokedAt,
        },
      });
    }

    if (action === "ROTATE_CREDENTIALS") {
      const { deviceId } = body;
      if (!deviceId) {
        return NextResponse.json(
          { success: false, error: "Device identifier (deviceId) is required." },
          { status: 400 }
        );
      }

      const result = await rotateBridgeDeviceCredentials({
        deviceId,
        adminId: currentUser.id,
      });

      return NextResponse.json({
        success: true,
        message: `Credentials rotated for device "${deviceId}". Update the Android terminal settings.`,
        credentials: {
          deviceId: result.deviceId,
          deviceToken: result.deviceToken,
          hmacSecret: result.hmacSecret,
        },
      });
    }

    if (action === "UPDATE_DEVICE") {
      const { deviceId, name, simPhoneNumber, carrier } = body;
      if (!deviceId) {
        return NextResponse.json(
          { success: false, error: "Device identifier (deviceId) is required." },
          { status: 400 }
        );
      }

      const updated = await prisma.paymentBridgeDevice.update({
        where: { deviceId },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          simPhoneNumber: simPhoneNumber !== undefined ? simPhoneNumber.trim() : undefined,
          carrier: carrier !== undefined ? carrier.trim() : undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: currentUser.id,
          action: "BRIDGE_DEVICE_METADATA_UPDATED",
          entityType: "PaymentBridgeDevice",
          entityId: updated.id,
          metadata: JSON.stringify({
            deviceId: updated.deviceId,
            name: updated.name,
            simPhoneNumber: updated.simPhoneNumber,
            carrier: updated.carrier,
          }),
        },
      }).catch(() => null);

      return NextResponse.json({
        success: true,
        message: `Device "${updated.name}" updated successfully.`,
        device: updated,
      });
    }

    if (action === "UPDATE_PROVIDER_DESTINATION") {
      const {
        provider,
        name,
        isEnabled,
        accountNumber,
        accountName,
        instructions,
        instructionsRw,
        webhookSecret,
      } = body;

      if (!provider || !name) {
        return NextResponse.json(
          { success: false, error: "Provider code and display name are required." },
          { status: 400 }
        );
      }

      const updated = await updatePaymentProviderConfig({
        provider,
        name,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
        accountNumber,
        accountName,
        instructions,
        instructionsRw,
        webhookSecret,
        adminId: currentUser.id,
      });

      return NextResponse.json({
        success: true,
        message: `Payment destination for ${provider} updated successfully.`,
        provider: updated,
      });
    }

    if (action === "RE_PAIR_TERMINAL") {
      const { deviceId, expiryMinutes } = body;
      if (!deviceId) {
        return NextResponse.json(
          { success: false, error: "Device identifier (deviceId) is required to re-pair." },
          { status: 400 }
        );
      }

      const device = await prisma.paymentBridgeDevice.findUnique({
        where: { deviceId },
      });

      if (!device) {
        return NextResponse.json(
          { success: false, error: `Device "${deviceId}" not found.` },
          { status: 404 }
        );
      }

      const rawCode = crypto.randomBytes(4).toString("hex").toUpperCase();
      const pairingCode = `${rawCode.slice(0, 4)}-${rawCode.slice(4)}`;
      const ttlMinutes = expiryMinutes ? Number(expiryMinutes) : 15;
      const pairingExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      const updated = await prisma.paymentBridgeDevice.update({
        where: { id: device.id },
        data: {
          status: "PENDING_PAIRING",
          pairingCode,
          pairingExpiresAt,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: currentUser.id,
          action: "BRIDGE_TERMINAL_RE_PAIRING_INITIATED",
          entityType: "PaymentBridgeDevice",
          entityId: updated.id,
          metadata: JSON.stringify({
            deviceId: updated.deviceId,
            name: updated.name,
            pairingExpiresAt: pairingExpiresAt.toISOString(),
          }),
        },
      }).catch(() => null);

      return NextResponse.json({
        success: true,
        message: `New pairing challenge generated for "${updated.name}".`,
        challenge: {
          id: updated.id,
          deviceId: updated.deviceId,
          name: updated.name,
          pairingCode,
          pairingExpiresAt,
          carrier: updated.carrier,
          simPhoneNumber: updated.simPhoneNumber,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: `Unrecognized action "${action}".` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[BRIDGE_DEVICES_POST_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process bridge device request." },
      { status: 400 }
    );
  }
}
