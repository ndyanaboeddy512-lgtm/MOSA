import { prisma } from "./prisma";

export interface CreateAuditLogParams {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates a permanent, immutable audit log entry in PostgreSQL.
 * Used for all security-sensitive and administrative actions.
 */
export async function logAuditEvent({
  actorId,
  action,
  entityType,
  entityId,
  metadata,
  ipAddress,
  userAgent,
}: CreateAuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? userAgent.slice(0, 255) : null,
      },
    });
  } catch (error) {
    // Audit log failures must be reported to server stderr but not crash core operations
    console.error("[AuditLog Error]: Failed to record audit log:", error);
    return null;
  }
}
