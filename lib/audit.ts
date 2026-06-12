import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Reusable audit-trail writer. `action` follows "<entity>.<verb>"
// (e.g. "employee.update", "strike.create"), `entityType` is PascalCase
// matching the Prisma model name.
export async function logAudit(
  actor: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: { actor, action, entityType, entityId, metadata: metadata as Prisma.InputJsonValue },
  });
}
