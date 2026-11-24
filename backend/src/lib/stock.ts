import { MOVEMENT_EFFECT, availableStock, type MovementType } from "@freshflow/shared";
import { Prisma } from "../generated/prisma/index.js";

type Tx = Prisma.TransactionClient;
export interface LockedBalance { productId: number; physicalStock: number; reservedStock: number; available: number }

/**
 * Locks the InventoryBalance rows of these products until the transaction ends (SELECT ... FOR UPDATE),
 * always in ascending product id so two transactions can never wait on each other in a circle (10-ARCHITECTURE).
 * A locking read returns the latest committed numbers, so availability must be checked on what this returns.
 * Products without a balance row are simply missing from the map (treat as 0 available).
 */
export async function lockBalances(tx: Tx, productIds: number[]): Promise<Map<number, LockedBalance>> {
  const ids = [...new Set(productIds)].sort((a, b) => a - b);
  if (ids.length === 0) return new Map();
  const rows = await tx.$queryRaw<{ productId: number; physicalStock: number; reservedStock: number }[]>`
    SELECT \`productId\`, \`physicalStock\`, \`reservedStock\` FROM \`InventoryBalance\`
    WHERE \`productId\` IN (${Prisma.join(ids)}) ORDER BY \`productId\` FOR UPDATE`;
  return new Map(rows.map((r) => {
    const physical = Number(r.physicalStock), reserved = Number(r.reservedStock);
    return [Number(r.productId), { productId: Number(r.productId), physicalStock: physical, reservedStock: reserved, available: availableStock(physical, reserved) }];
  }));
}

export interface MovementInput {
  productId: number; type: MovementType; quantity: number;
  reference: string; reason: string; actorId: number | null;
}

/**
 * The only way stock numbers change: writes the movement row and applies its effect to the balance, in the
 * caller's transaction. The caller must already hold the row lock (lockBalances) and have checked the result
 * stays valid; the DB CHECK constraints are the last line of defence, not the validation.
 */
export async function applyMovement(tx: Tx, m: MovementInput) {
  if (!Number.isInteger(m.quantity) || m.quantity <= 0) throw new Error("movement quantity must be a positive integer");
  const e = MOVEMENT_EFFECT[m.type];
  await tx.stockMovement.create({ data: { productId: m.productId, type: m.type, quantity: m.quantity, reference: m.reference, reason: m.reason, actorId: m.actorId } });
  await tx.inventoryBalance.update({
    where: { productId: m.productId },
    data: {
      ...(e.physical ? { physicalStock: { increment: e.physical * m.quantity } } : {}),
      ...(e.reserved ? { reservedStock: { increment: e.reserved * m.quantity } } : {}),
    },
  });
}
