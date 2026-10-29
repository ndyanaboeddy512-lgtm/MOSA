import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCanonicalServerUrl, getApprovedDomains } from "@/lib/domain-config";

export interface CreatePairingChallengeParams {
  name: string;
  simPhoneNumber?: string;
  carrier?: string;
  adminId: string;
  expiryMinutes?: number;
}

export interface CompletePairingParams {
  pairingCode: string;
  deviceHardwareId?: string;
  appVersion?: string;
}

export interface RecordHeartbeatParams {
  deviceId: string;
  deviceToken: string;
  batteryLevel?: number;
  isCharging?: boolean;
  networkType?: string;
  appVersion?: string;
  pendingSyncCount?: number;
}

export interface WebhookAuthResult {
  isAuthenticated: boolean;
  device?: any;
  providerSecret?: string;
  authMethod: "DEVICE_CREDENTIAL" | "PROVIDER_SECRET" | "NONE";
  error?: string;
}

/**
 * Creates a new one-time device pairing challenge.
 * Generates high-entropy device tokens, HMAC secret, and a short, human-readable pairing code.
 */
export async function createDevicePairingChallenge({
  name,
  simPhoneNumber,
  carrier = "MTN Rwanda",
  adminId,
  expiryMinutes,
}: CreatePairingChallengeParams) {
  if (!name || name.trim().length === 0) {
    throw new Error("Device friendly name is required (e.g. 'Hub Office Primary Phone').");
  }

  // Generate unique device ID, device bearer token, and HMAC secret
  const deviceId = `bridge_${crypto.randomBytes(6).toString("hex")}`;
  const deviceToken = `mbt_${crypto.randomBytes(24).toString("hex")}`;
  const hmacSecret = `mbh_${crypto.randomBytes(24).toString("hex")}`;

  // Generate clean 8-character uppercase pairing code (e.g., "7A2F-9B1D")
  const rawCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const pairingCode = `${rawCode.slice(0, 4)}-${rawCode.slice(4)}`;

  // Valid for expiryMinutes (default 15 minutes)
  const ttlMinutes = expiryMinutes && expiryMinutes > 0 ? expiryMinutes : 15;
  const pairingExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const device = await prisma.paymentBridgeDevice.create({
    data: {
      name: name.trim(),
      deviceId,
      deviceToken,
      hmacSecret,
      simPhoneNumber: simPhoneNumber ? simPhoneNumber.trim() : null,
      carrier: carrier.trim(),
      status: "PENDING_PAIRING",
      pairingCode,
      pairingExpiresAt,
      enrolledById: adminId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      action: "BRIDGE_DEVICE_PAIRING_INITIATED",
      entityType: "PaymentBridgeDevice",
      entityId: device.id,
      metadata: JSON.stringify({
        deviceId,
        name: device.name,
        simPhoneNumber: device.simPhoneNumber,
        carrier: device.carrier,
        pairingExpiresAt: pairingExpiresAt.toISOString(),
      }),
    },
  }).catch(() => null);

  const qrPayload = JSON.stringify({
    version: "1.0",
    endpoint: "/api/payments/bridge/pair",
    deviceId,
    pairingCode,
    carrier: device.carrier,
    issuedAt: new Date().toISOString(),
  });

  return {
    id: device.id,
    name: device.name,
    deviceId: device.deviceId,
    simPhoneNumber: device.simPhoneNumber,
    carrier: device.carrier,
    pairingCode,
    pairingExpiresAt,
    qrPayload,
  };
}

/**
 * Completes one-time pairing from the Android Bridge App.
 * Returns device credentials (deviceToken, hmacSecret) to the phone and activates the terminal.
 */
export async function completeDevicePairing({
  pairingCode,
  deviceHardwareId,
  appVersion,
}: CompletePairingParams) {
  if (!pairingCode) {
    throw new Error("One-time pairing code is required.");
  }

  const raw = pairingCode.trim().toUpperCase().replace(/\s+/g, "");
  // Support both "E7C5-7131" and "E7C57131"
  const formattedCode = raw.includes("-")
    ? raw
    : raw.length === 8
    ? `${raw.slice(0, 4)}-${raw.slice(4)}`
    : raw;

  let device = await prisma.paymentBridgeDevice.findFirst({
    where: {
      OR: [
        { pairingCode: formattedCode },
        { pairingCode: raw },
      ],
    },
  });

  if (!device) {
    throw new Error("Invalid or unrecognised pairing code.");
  }

  if (device.status !== "PENDING_PAIRING") {
    throw new Error(`Device is already in ${device.status} status and cannot be paired again.`);
  }

  if (!device.pairingExpiresAt || new Date() > device.pairingExpiresAt) {
    await prisma.paymentBridgeDevice.update({
      where: { id: device.id },
      data: {
        status: "REVOKED",
        revokedReason: "Pairing code expired before completion.",
      },
    });
    throw new Error("Pairing code has expired. Please initiate a new pairing code in Command Center.");
  }

  const effectiveDeviceId = deviceHardwareId?.trim() || device.deviceId;

  // Check if hardware ID conflicts with another device
  if (deviceHardwareId && deviceHardwareId !== device.deviceId) {
    const existing = await prisma.paymentBridgeDevice.findUnique({
      where: { deviceId: deviceHardwareId },
    });
    if (existing && existing.id !== device.id) {
      // Archive previous device profile's deviceId to free up the hardware identifier for the new pairing
      const archivedId = `${existing.deviceId}_archived_${Date.now()}`;
      await prisma.paymentBridgeDevice.update({
        where: { id: existing.id },
        data: {
          deviceId: archivedId,
          status: "REVOKED",
          revokedAt: new Date(),
          revokedReason: `Hardware re-enrolled into new profile "${device.name}"`,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "BRIDGE_DEVICE_HARDWARE_REBOUND",
          entityType: "PaymentBridgeDevice",
          entityId: existing.id,
          metadata: JSON.stringify({
            previousDeviceId: existing.deviceId,
            archivedAs: archivedId,
            newProfileId: device.id,
            newProfileName: device.name,
          }),
        },
      }).catch(() => null);
    }
  }

  const updatedDevice = await prisma.paymentBridgeDevice.update({
    where: { id: device.id },
    data: {
      deviceId: effectiveDeviceId,
      status: "ACTIVE",
      appVersion: appVersion || "1.0.0",
      enrolledAt: new Date(),
      pairingCode: null, // Wipe one-time code immediately upon consumption
      pairingExpiresAt: null,
      lastHeartbeatAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "BRIDGE_DEVICE_PAIRED_SUCCESSFULLY",
      entityType: "PaymentBridgeDevice",
      entityId: updatedDevice.id,
      metadata: JSON.stringify({
        deviceId: updatedDevice.deviceId,
        name: updatedDevice.name,
        appVersion: updatedDevice.appVersion,
        enrolledAt: updatedDevice.enrolledAt?.toISOString(),
      }),
    },
  }).catch(() => null);

  const canonicalServerUrl = await getCanonicalServerUrl();
  const approvedDomains = await getApprovedDomains();

  return {
    success: true,
    deviceId: updatedDevice.deviceId,
    deviceToken: updatedDevice.deviceToken,
    hmacSecret: updatedDevice.hmacSecret,
    name: updatedDevice.name,
    carrier: updatedDevice.carrier,
    simPhoneNumber: updatedDevice.simPhoneNumber,
    enrolledAt: updatedDevice.enrolledAt,
    serverUrl: canonicalServerUrl,
    approvedDomains,
  };
}

/**
 * Records a recurring heartbeat from the physical Android phone.
 * Reports battery percentage, charging status, network type, and verifies active status.
 */
export async function recordDeviceHeartbeat({
  deviceId,
  deviceToken,
  batteryLevel,
  isCharging,
  networkType,
  appVersion,
  pendingSyncCount,
}: RecordHeartbeatParams) {
  if (!deviceId || !deviceToken) {
    throw new Error("Both deviceId and deviceToken are required for heartbeat authentication.");
  }

  const device = await prisma.paymentBridgeDevice.findFirst({
    where: {
      deviceId,
      deviceToken,
    },
  });

  if (!device) {
    throw new Error("Device credentials not recognized. Heartbeat rejected.");
  }

  if (device.status === "REVOKED") {
    return {
      success: false,
      isDeviceActive: false,
      status: "REVOKED",
      reason: device.revokedReason || "Device has been revoked by an administrator.",
    };
  }

  if (device.status === "SUSPENDED") {
    return {
      success: false,
      isDeviceActive: false,
      status: "SUSPENDED",
      reason: "Device is temporarily suspended.",
    };
  }

  const cleanNetwork = networkType || device.networkType || "CELLULAR";
  const effectiveNetwork =
    pendingSyncCount !== undefined && pendingSyncCount > 0
      ? `${cleanNetwork} (Queued: ${pendingSyncCount})`
      : cleanNetwork;

  const updated = await prisma.paymentBridgeDevice.update({
    where: { id: device.id },
    data: {
      lastHeartbeatAt: new Date(),
      batteryLevel: batteryLevel !== undefined ? Number(batteryLevel) : device.batteryLevel,
      isCharging: isCharging !== undefined ? Boolean(isCharging) : device.isCharging,
      networkType: effectiveNetwork,
      appVersion: appVersion || device.appVersion,
    },
  });

  const canonicalServerUrl = await getCanonicalServerUrl();
  const approvedDomains = await getApprovedDomains();

  return {
    success: true,
    isDeviceActive: true,
    status: updated.status,
    serverTime: new Date().toISOString(),
    configuration: {
      serverUrl: canonicalServerUrl,
      approvedDomains,
      deviceName: updated.name,
      carrier: updated.carrier,
      simPhoneNumber: updated.simPhoneNumber,
    },
  };
}

/**
 * Revokes a bridge device (e.g. if phone is lost, damaged, or replaced).
 * Retains all historical logs, transactions, and audit records.
 */
export async function revokeBridgeDevice({
  deviceId,
  adminId,
  reason,
}: {
  deviceId: string;
  adminId: string;
  reason?: string;
}) {
  const device = await prisma.paymentBridgeDevice.findUnique({
    where: { deviceId },
  });

  if (!device) {
    throw new Error(`Device with ID "${deviceId}" not found.`);
  }

  const revoked = await prisma.paymentBridgeDevice.update({
    where: { id: device.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedById: adminId,
      revokedReason: reason || "Revoked by Administrator",
      pairingCode: null,
      pairingExpiresAt: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      action: "BRIDGE_DEVICE_REVOKED",
      entityType: "PaymentBridgeDevice",
      entityId: revoked.id,
      metadata: JSON.stringify({
        deviceId: revoked.deviceId,
        name: revoked.name,
        reason: revoked.revokedReason,
        revokedAt: revoked.revokedAt?.toISOString(),
      }),
    },
  }).catch(() => null);

  return revoked;
}

/**
 * Rotates device credentials (new bearer token & HMAC secret) without breaking device identity.
 */
export async function rotateBridgeDeviceCredentials({
  deviceId,
  adminId,
}: {
  deviceId: string;
  adminId: string;
}) {
  const device = await prisma.paymentBridgeDevice.findUnique({
    where: { deviceId },
  });

  if (!device) {
    throw new Error(`Device with ID "${deviceId}" not found.`);
  }

  if (device.status === "REVOKED") {
    throw new Error("Cannot rotate credentials for a revoked device.");
  }

  const newDeviceToken = `mbt_${crypto.randomBytes(24).toString("hex")}`;
  const newHmacSecret = `mbh_${crypto.randomBytes(24).toString("hex")}`;

  const updated = await prisma.paymentBridgeDevice.update({
    where: { id: device.id },
    data: {
      deviceToken: newDeviceToken,
      hmacSecret: newHmacSecret,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      action: "BRIDGE_DEVICE_CREDENTIALS_ROTATED",
      entityType: "PaymentBridgeDevice",
      entityId: updated.id,
      metadata: JSON.stringify({
        deviceId: updated.deviceId,
        name: updated.name,
      }),
    },
  }).catch(() => null);

  return {
    success: true,
    deviceId: updated.deviceId,
    deviceToken: newDeviceToken,
    hmacSecret: newHmacSecret,
  };
}

/**
 * Authenticates an incoming payment webhook request.
 * Supports:
 *  1. Enrolled Android Bridge Device credentials (x-mosa-device-id / bearer token + device HMAC)
 *  2. Standard Provider Webhook Secret (backward compatible with simulator and aggregator webhooks)
 */
export async function authenticateWebhookRequest({
  rawBody,
  signature,
  deviceIdHeader,
  authHeader,
  provider,
}: {
  rawBody: string;
  signature: string;
  deviceIdHeader?: string | null;
  authHeader?: string | null;
  provider: string;
}): Promise<WebhookAuthResult> {
  // 1. Check if device authentication is supplied
  let deviceToken: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    deviceToken = authHeader.slice(7).trim();
  }

  const deviceId = deviceIdHeader?.trim();

  if (deviceId || deviceToken) {
    const device = await prisma.paymentBridgeDevice.findFirst({
      where: {
        ...(deviceId ? { deviceId } : {}),
        ...(deviceToken ? { deviceToken } : {}),
      },
    });

    if (!device) {
      return {
        isAuthenticated: false,
        authMethod: "DEVICE_CREDENTIAL",
        error: "Bridge device identifier or token not recognized.",
      };
    }

    if (device.status !== "ACTIVE") {
      return {
        isAuthenticated: false,
        device,
        authMethod: "DEVICE_CREDENTIAL",
        error: `Bridge device is in ${device.status} status. Only ACTIVE devices may submit payments.`,
      };
    }

    // Verify HMAC using the device-specific HMAC secret
    const isValidSignature = verifyHmac(rawBody, signature, device.hmacSecret);
    if (!isValidSignature) {
      return {
        isAuthenticated: false,
        device,
        authMethod: "DEVICE_CREDENTIAL",
        error: "Invalid cryptographic HMAC signature for bridge device.",
      };
    }

    // Touch device sync timestamp
    await prisma.paymentBridgeDevice.update({
      where: { id: device.id },
      data: { lastSyncAt: new Date() },
    }).catch(() => null);

    return {
      isAuthenticated: true,
      device,
      authMethod: "DEVICE_CREDENTIAL",
    };
  }

  // 2. Fallback to Provider Webhook Secret (Simulator & direct provider webhooks)
  const providerConfig = await prisma.paymentProviderConfig.findUnique({
    where: { provider },
  });

  const secret = providerConfig?.webhookSecret || process.env.PAYMENT_WEBHOOK_SECRET || "";
  if (!secret) {
    return {
      isAuthenticated: false,
      authMethod: "PROVIDER_SECRET",
      error: `Provider ${provider} webhook secret is not configured on server.`,
    };
  }

  const isValidSignature = verifyHmac(rawBody, signature, secret);
  if (!isValidSignature) {
    return {
      isAuthenticated: false,
      authMethod: "PROVIDER_SECRET",
      error: "Invalid cryptographic webhook signature.",
    };
  }

  return {
    isAuthenticated: true,
    providerSecret: secret,
    authMethod: "PROVIDER_SECRET",
  };
}

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const computed = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(computed, "hex"));
  } catch {
    try {
      const computed = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      return signature.trim().toLowerCase() === computed.trim().toLowerCase();
    } catch {
      return false;
    }
  }
}
