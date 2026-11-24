import type { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../db.js";

type Db = Prisma.TransactionClient | typeof prisma;

/** BFDC-TBD (08 #1): pickup only until BFDC confirms delivery. Missing setting = disabled. */
export async function deliveryEnabled(db: Db = prisma): Promise<boolean> {
  const s = await db.setting.findUnique({ where: { key: "delivery_enabled" } });
  return s?.value === "true";
}
