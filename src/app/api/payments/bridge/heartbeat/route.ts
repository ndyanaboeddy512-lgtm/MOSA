import { NextRequest, NextResponse } from "next/server";
import { recordDeviceHeartbeat } from "@/lib/payments/bridge-devices";

/**
 * Terminal heartbeat endpoint called every 15-30 minutes by the Android Bridge background worker.
 * Reports battery percentage, charging state, network type, and validates active device authorization.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const deviceIdHeader = req.headers.get("x-mosa-device-id");

    const body = await req.json().catch(() => ({}));
    const {
      deviceId = deviceIdHeader,
      deviceToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined,
      batteryLevel,
      isCharging,
      networkType,
      appVersion,
      pendingSyncCount,
    } = body;

    if (!deviceId || !deviceToken) {
      return NextResponse.json(
        { success: false, error: "Missing device credentials (deviceId and deviceToken required)." },
        { status: 401 }
      );
    }

    const result = await recordDeviceHeartbeat({
      deviceId,
      deviceToken,
      batteryLevel,
      isCharging,
      networkType,
      appVersion,
      pendingSyncCount,
    });

    if (!result.isDeviceActive) {
      return NextResponse.json(
        {
          success: false,
          isDeviceActive: false,
          status: result.status,
          error: result.reason || "Device terminal is not currently active.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      isDeviceActive: true,
      status: result.status,
      serverTime: result.serverTime,
      configuration: result.configuration,
    });
  } catch (error: any) {
    console.error("[BRIDGE_HEARTBEAT_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record heartbeat." },
      { status: 400 }
    );
  }
}
