import type { Request } from "express";
import type { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../db.js";

type Db = Prisma.TransactionClient | typeof prisma;
export interface AuditEntry {
  actorId: number | null;
  action: string;          // e.g. "user.created", "auth.password_changed"
  targetType: string;      // e.g. "User"
  targetId: string | number;
  summary?: string;        // safe summary only: never passwords, hashes, tokens or full records
}

/** Append-only. There is deliberately no update or delete helper for audit rows. */
export async function audit(db: Db, req: Request | null, e: AuditEntry) {
  await db.auditLog.create({
    data: { actorId: e.actorId, action: e.action, targetType: e.targetType, targetId: String(e.targetId),
      summary: e.summary ?? null, requestId: req?.id != null ? String(req.id).slice(0, 40) : null },
  });
}
