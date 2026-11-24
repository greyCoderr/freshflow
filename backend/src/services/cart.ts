import { MAX_CART_LINES, availableStock, cartLineProblem, stockLimitMessage, type CartLineProblem } from "@freshflow/shared";
import { prisma } from "../db.js";
import { HttpError } from "../lib/http.js";
import { deliveryEnabled } from "../lib/settings.js";
import { isUniqueViolation } from "../lib/tx.js";

export interface CartLineView {
  productId: number; name: string; unit: string; imageUrl: string | null;
  /** Current price. Provisional: checkout recalculates on the server. */
  unitPriceCentavos: number; quantity: number; subtotalCentavos: number;
  available: number; problem: CartLineProblem | null;
}
export interface CartView {
  lines: CartLineView[];
  count: number;              // total units
  totalCentavos: number;      // at current prices
  canCheckout: boolean;       // has lines and none has a problem
  /** False for accounts without a customer profile (e.g. ADMIN browsing the shop). */
  canOrder: boolean;
  deliveryEnabled: boolean;
  contact: { name: string; contactNumber: string } | null; // checkout defaults
}

/** The customer's cart with current prices and availability. Nothing here is trusted at checkout. */
export async function cartView(userId: number): Promise<CartView> {
  const [cart, user, delivery] = await Promise.all([
    prisma.cart.findUnique({ where: { userId }, include: { items: { include: { product: { include: { balance: true } } }, orderBy: { productId: "asc" } } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, customer: { select: { contactNumber: true } } } }),
    deliveryEnabled(),
  ]);
  const lines: CartLineView[] = (cart?.items ?? []).map(({ product: p, quantity }) => {
    const available = Math.max(0, availableStock(p.balance?.physicalStock ?? 0, p.balance?.reservedStock ?? 0));
    return {
      productId: p.id, name: p.name, unit: p.unit, imageUrl: p.imageUrl, unitPriceCentavos: p.priceCentavos,
      quantity, subtotalCentavos: p.priceCentavos * quantity, available, problem: cartLineProblem(p.isActive, available, quantity),
    };
  });
  const canOrder = !!user?.customer;
  return {
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    totalCentavos: lines.reduce((n, l) => n + l.subtotalCentavos, 0),
    canCheckout: canOrder && lines.length > 0 && lines.every((l) => !l.problem),
    canOrder, deliveryEnabled: delivery,
    contact: user?.customer ? { name: user.fullName, contactNumber: user.customer.contactNumber } : null,
  };
}

export const notCustomer = () =>
  new HttpError(403, "Orders are placed from a customer account. Staff record walk-in sales in POS.", "not_customer");

export async function requireCustomer(userId: number) {
  const c = await prisma.customer.findUnique({ where: { userId } });
  if (!c) throw notCustomer();
  return c;
}

async function ensureCart(userId: number) {
  try { return await prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} }); }
  catch (e) { if (isUniqueViolation(e)) return prisma.cart.findUniqueOrThrow({ where: { userId } }); throw e; } // two first adds at once
}

async function sellable(productId: number) {
  const p = await prisma.product.findUnique({ where: { id: productId }, include: { balance: true } });
  if (!p || !p.isActive) throw new HttpError(409, "This product is no longer sold.", "product_unavailable", undefined, { productId });
  return { product: p, available: Math.max(0, availableStock(p.balance?.physicalStock ?? 0, p.balance?.reservedStock ?? 0)) };
}

const stockLimit = (productId: number, available: number, inCart: number) =>
  new HttpError(409, stockLimitMessage(available, inCart), "stock_limit", undefined, { productId, available, inCart });

/** Add: the quantity is added to what is already in the cart. Checked against stock now (advisory) and again at checkout. */
export async function addToCart(userId: number, productId: number, quantity: number) {
  await requireCustomer(userId);
  const { available } = await sellable(productId);
  const cart = await ensureCart(userId);
  const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
  const inCart = existing?.quantity ?? 0;
  if (!existing && (await prisma.cartItem.count({ where: { cartId: cart.id } })) >= MAX_CART_LINES)
    throw new HttpError(409, `A cart holds up to ${MAX_CART_LINES} different products. Place this order first.`, "cart_full");
  if (inCart + quantity > available) throw stockLimit(productId, available, inCart);
  if (inCart + quantity > 1000) throw new HttpError(400, "That is more than we can take in one order.", "validation", { quantity: ["That is more than we can take in one order"] });
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity },
    update: { quantity: { increment: quantity } },
  });
}

/** Set: the quantity replaces the cart line. Lowering is how a customer fixes a line that is over the stock left. */
export async function setCartQuantity(userId: number, productId: number, quantity: number) {
  await requireCustomer(userId);
  const cart = await prisma.cart.findUnique({ where: { userId } });
  const item = cart && await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
  if (!cart || !item) throw new HttpError(404, "That item is not in your cart any more.", "not_in_cart");
  const { available } = await sellable(productId);
  if (quantity > available) throw stockLimit(productId, available, 0);
  await prisma.cartItem.update({ where: { cartId_productId: { cartId: cart.id, productId } }, data: { quantity } });
}

/** Remove. Removing something that is not there is not an error (a double click). */
export async function removeFromCart(userId: number, productId: number) {
  await prisma.cartItem.deleteMany({ where: { cart: { userId }, productId } });
}
