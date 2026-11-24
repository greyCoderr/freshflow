import { CART_PROBLEM_TEXT, cartLineProblem, formatPeso, type CartLineProblem, type CheckoutInput, type RoleName } from "@freshflow/shared";
import type { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../db.js";
import { HttpError } from "../lib/http.js";
import { deliveryEnabled } from "../lib/settings.js";
import { lockBalances, applyMovement } from "../lib/stock.js";
import { newOrderNo } from "../lib/order-no.js";
import { isUniqueViolation, STOCK_TX, withTxRetry } from "../lib/tx.js";
import { notCustomer } from "./cart.js";

/** What a customer may see about their own order: no staff note, no actor ids, no stock numbers. */
export interface CustomerOrder {
  orderNo: string; status: string; fulfillment: string;
  contactName: string; contactNumber: string; address: string | null; note: string | null;
  totalCentavos: number; createdAt: string;
  items: { productId: number; productName: string; unit: string; unitPriceCentavos: number; quantity: number; subtotalCentavos: number }[];
  history: { toStatus: string; at: string; actorRole: string | null }[];
}
const orderInclude = { items: { orderBy: { id: "asc" } }, history: { orderBy: { id: "asc" } } } as const satisfies Prisma.OrderInclude;
type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function toCustomerOrder(o: OrderRow): CustomerOrder {
  return {
    orderNo: o.orderNo, status: o.status, fulfillment: o.fulfillment,
    contactName: o.contactName, contactNumber: o.contactNumber, address: o.address, note: o.note,
    totalCentavos: o.totalCentavos, createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({ productId: i.productId, productName: i.productName, unit: i.unit, unitPriceCentavos: i.unitPriceCentavos, quantity: i.quantity, subtotalCentavos: i.subtotalCentavos })),
    history: o.history.map((h) => ({ toStatus: h.toStatus, at: h.createdAt.toISOString(), actorRole: h.actorRole })),
  };
}

export interface StockProblem { productId: number; name: string; requested: number; available: number; problem: CartLineProblem; message: string }
export type PlaceResult = { order: CustomerOrder; replayed: boolean };

/** The same operation key from another customer: refuse without saying anything about that order. */
const keyConflict = () => new HttpError(409, "This checkout was already used. Reload the page and try again.", "operation_key_conflict");

async function findByKey(db: Prisma.TransactionClient | typeof prisma, operationKey: string, customerId: number): Promise<PlaceResult | null> {
  const o = await db.order.findUnique({ where: { operationKey }, include: orderInclude });
  if (!o) return null;
  if (o.customerId !== customerId) throw keyConflict();
  return { order: toCustomerOrder(o), replayed: true };
}

/**
 * Places an order from the customer's server-side cart. ONE transaction:
 *   1. lock the customer's Cart row (serialises double submits and two open tabs of the same customer)
 *   2. idempotency: an order with this operationKey already exists -> return it, change nothing
 *   3. lock InventoryBalance rows FOR UPDATE in ascending product id, re-check availability on the locked numbers
 *   4. recalculate every price on the server; refuse if it differs from the total the customer reviewed
 *   5. write order + item snapshots + status history (null -> NEW) + ORDER_RESERVED movements, raise reserved stock
 *   6. empty the cart
 * Any refusal rolls everything back, so a failed checkout leaves cart, stock and orders exactly as they were.
 */
export async function placeOrder(user: { id: number; role: RoleName }, input: CheckoutInput): Promise<PlaceResult> {
  const customer = await prisma.customer.findUnique({ where: { userId: user.id } });
  if (!customer) throw notCustomer();

  // Cheap replay check before any locking (the in-transaction check below is the one that counts).
  const early = await findByKey(prisma, input.operationKey, customer.id);
  if (early) return early;

  if (input.fulfillment === "DELIVERY" && !(await deliveryEnabled())) {
    // BFDC-TBD (08 #1): pickup only until BFDC confirms delivery.
    throw new HttpError(400, "Please check the highlighted fields.", "validation", { fulfillment: ["Delivery is not available yet. Choose pickup."] });
  }

  for (let attempt = 1; ; attempt++) {
    try {
      return await withTxRetry(() => prisma.$transaction(async (tx) => {
        // 1. Same customer, two submits at once: the second waits here until the first commits or rolls back.
        //    Locking read first, so the plain reads below see what the first submit committed.
        const carts = await tx.$queryRaw<{ id: number }[]>`SELECT \`id\` FROM \`Cart\` WHERE \`userId\` = ${user.id} FOR UPDATE`;

        // 2. Idempotency.
        const prior = await findByKey(tx, input.operationKey, customer.id);
        if (prior) return prior;

        const cartId = carts[0] ? Number(carts[0].id) : null;
        const items = cartId == null ? [] : await tx.cartItem.findMany({ where: { cartId }, include: { product: true }, orderBy: { productId: "asc" } });
        if (items.length === 0) throw new HttpError(409, "Your cart is empty. Add products before placing an order.", "cart_empty");

        // 3. Lock stock rows and re-check on the locked (latest committed) numbers.
        const balances = await lockBalances(tx, items.map((i) => i.productId));
        const problems: StockProblem[] = [];
        for (const i of items) {
          const available = Math.max(0, balances.get(i.productId)?.available ?? 0);
          const problem = cartLineProblem(i.product.isActive, available, i.quantity);
          if (problem) problems.push({ productId: i.productId, name: i.product.name, requested: i.quantity, available, problem, message: CART_PROBLEM_TEXT[problem](available) });
        }
        if (problems.length) {
          throw new HttpError(409, "Stock changed since you added these items. Review your cart, then place the order again.", "stock_changed", undefined, { problems });
        }

        // 4. Server prices only. Whatever the client sent about prices was stripped by the schema.
        const lines = items.map((i) => ({
          productId: i.productId, productName: i.product.name, unit: i.product.unit,
          unitPriceCentavos: i.product.priceCentavos, quantity: i.quantity, subtotalCentavos: i.product.priceCentavos * i.quantity,
        }));
        const totalCentavos = lines.reduce((n, l) => n + l.subtotalCentavos, 0);
        if (totalCentavos !== input.expectedTotalCentavos) {
          throw new HttpError(409, `Prices changed since you opened checkout. The total is now ${formatPeso(totalCentavos)}. Review it, then place the order.`, "price_changed", undefined, { totalCentavos });
        }

        // 5. Order, snapshots, history, reservation.
        const orderNo = newOrderNo();
        const order = await tx.order.create({
          data: {
            orderNo, operationKey: input.operationKey, customerId: customer.id, status: "NEW", fulfillment: input.fulfillment,
            contactName: input.contactName, contactNumber: input.contactNumber,
            address: input.fulfillment === "DELIVERY" ? input.address ?? null : null, note: input.note || null,
            totalCentavos,
            items: { create: lines },
            history: { create: { fromStatus: null, toStatus: "NEW", actorId: user.id, actorRole: user.role } },
          },
          include: orderInclude,
        });
        for (const l of lines) {
          await applyMovement(tx, { productId: l.productId, type: "ORDER_RESERVED", quantity: l.quantity, reference: orderNo, reason: "Reserved for customer order", actorId: user.id });
        }

        // 6. Empty the cart.
        await tx.cartItem.deleteMany({ where: { cartId: cartId! } });
        return { order: toCustomerOrder(order), replayed: false };
      }, STOCK_TX));
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      // Unique index hit: either another request with this key won the race (return its result),
      // or the random order number collided (try again with a new one).
      const prior = await findByKey(prisma, input.operationKey, customer.id);
      if (prior) return prior;
      if (attempt >= 3) throw e;
    }
  }
}

export async function findCustomerOrder(userId: number, orderNo: string): Promise<CustomerOrder | null> {
  const o = await prisma.order.findFirst({ where: { orderNo, customer: { userId } }, include: orderInclude });
  return o ? toCustomerOrder(o) : null;
}
