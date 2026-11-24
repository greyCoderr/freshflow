import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { MOVEMENT_EFFECT, type MovementType } from "@freshflow/shared";
import { createProduct, createUser, makeApp, prisma, resetDb, signedInCustomer, signIn, TEST_PASSWORD } from "./db/helpers.js";

type Agent = ReturnType<typeof request.agent>;
const app = makeApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const add = (a: Agent, productId: number, quantity: number) => a.post("/api/cart/items").send({ productId, quantity });
async function checkout(a: Agent, o: Record<string, unknown> = {}) {
  const cart = await a.get("/api/cart");
  return a.post("/api/orders").send({
    operationKey: randomUUID(), contactName: "Ana Cruz", contactNumber: "09171234567", fulfillment: "PICKUP",
    expectedTotalCentavos: cart.body.totalCentavos, ...o,
  });
}
const balance = (productId: number) => prisma.inventoryBalance.findUniqueOrThrow({ where: { productId } });

/** Stock only changes through movements: replaying every movement must give the stored balance exactly. */
async function expectBalanceMatchesMovements(productId: number) {
  const moves = await prisma.stockMovement.findMany({ where: { productId } });
  let physical = 0, reserved = 0;
  for (const m of moves) {
    const e = MOVEMENT_EFFECT[m.type as MovementType];
    physical += e.physical * m.quantity; reserved += e.reserved * m.quantity;
  }
  const b = await balance(productId);
  expect({ physical: b.physicalStock, reserved: b.reservedStock }).toEqual({ physical, reserved });
  expect(b.reservedStock).toBeLessThanOrEqual(b.physicalStock);
  expect(b.reservedStock).toBeGreaterThanOrEqual(0);
}

describe("cart", () => {
  it("adds, accumulates, changes and removes lines, always answering with server prices and totals", async () => {
    const milk = await createProduct({ stock: 10, priceCentavos: 9500 });
    const cheese = await createProduct({ stock: 5, priceCentavos: 18000 });
    const { agent } = await signedInCustomer(app);

    let res = await add(agent, milk.id, 2);
    expect(res.status).toBe(200);
    res = await add(agent, milk.id, 1);
    res = await add(agent, cheese.id, 1);
    expect(res.body.lines).toHaveLength(2);
    expect(res.body.lines.find((l: { productId: number }) => l.productId === milk.id)).toMatchObject({ quantity: 3, unitPriceCentavos: 9500, subtotalCentavos: 28500, problem: null });
    expect(res.body).toMatchObject({ count: 4, totalCentavos: 28500 + 18000, canCheckout: true, canOrder: true, deliveryEnabled: false });

    res = await agent.patch(`/api/cart/items/${milk.id}`).send({ quantity: 1 });
    expect(res.status).toBe(200);
    expect(res.body.totalCentavos).toBe(9500 + 18000);

    res = await agent.delete(`/api/cart/items/${cheese.id}`);
    expect(res.body.lines.map((l: { productId: number }) => l.productId)).toEqual([milk.id]);
    expect((await agent.delete(`/api/cart/items/${cheese.id}`)).status).toBe(200); // second click: no error
  });

  it("refuses quantities above available stock with a plain message, counting what is already in the cart", async () => {
    const p = await createProduct({ stock: 4 });
    const { agent } = await signedInCustomer(app);
    let res = await add(agent, p.id, 5);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: "stock_limit", available: 4, error: "Only 4 left. Lower the quantity to continue." });

    expect((await add(agent, p.id, 3)).status).toBe(200);
    res = await add(agent, p.id, 2);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Only 4 left, and 3 are already in your cart.");

    res = await agent.patch(`/api/cart/items/${p.id}`).send({ quantity: 9 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("stock_limit");
    expect((await agent.get("/api/cart")).body.lines[0].quantity).toBe(3);
  });

  it("rejects zero, negative, fractional and text quantities, and unknown or retired products", async () => {
    const p = await createProduct({ stock: 4 });
    const retired = await createProduct({ stock: 4, isActive: false });
    const { agent } = await signedInCustomer(app);
    for (const quantity of [0, -1, 1.5, "2"]) expect((await add(agent, p.id, quantity as number)).status).toBe(400);
    expect((await agent.patch(`/api/cart/items/${p.id}`).send({ quantity: 0 })).status).toBe(400);
    expect((await add(agent, retired.id, 1)).body.code).toBe("product_unavailable");
    expect((await add(agent, 999_999, 1)).body.code).toBe("product_unavailable");
    expect(await prisma.cartItem.count()).toBe(0);
  });

  it("keeps the cart on the server across sign-ins", async () => {
    const p = await createProduct({ stock: 4 });
    const { user, agent } = await signedInCustomer(app);
    await add(agent, p.id, 2);
    const again = await signIn(app, user.email, TEST_PASSWORD);
    expect((await again.get("/api/cart")).body.count).toBe(2);
  });

  it("an account without a customer profile (ADMIN) can view but not fill a cart or place an order", async () => {
    const p = await createProduct({ stock: 4 });
    const admin = await createUser("ADMIN");
    const agent = await signIn(app, admin.email, TEST_PASSWORD);
    expect((await agent.get("/api/cart")).body).toMatchObject({ canOrder: false, canCheckout: false });
    expect((await add(agent, p.id, 1)).body.code).toBe("not_customer");
    expect((await checkout(agent, { expectedTotalCentavos: 0 })).body.code).toBe("not_customer");
  });
});

describe("checkout", () => {
  it("writes order, item snapshots, status history and reservation in one go, and empties the cart", async () => {
    const milk = await createProduct({ stock: 10, priceCentavos: 9500, name: "Fresh Milk" });
    const cheese = await createProduct({ stock: 5, priceCentavos: 18000, name: "Soft Cheese" });
    const { user, agent } = await signedInCustomer(app);
    await add(agent, milk.id, 3);
    await add(agent, cheese.id, 2);

    const res = await checkout(agent, { note: "Pick up after 3 PM" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "NEW", fulfillment: "PICKUP", totalCentavos: 3 * 9500 + 2 * 18000, replayed: false, note: "Pick up after 3 PM" });
    expect(res.body.orderNo).toMatch(/^FF-\d{6}-[2-9A-Z]{5}$/);
    expect(res.body.items).toEqual([
      { productId: milk.id, productName: "Fresh Milk", unit: "1 L bottle", unitPriceCentavos: 9500, quantity: 3, subtotalCentavos: 28500 },
      { productId: cheese.id, productName: "Soft Cheese", unit: "1 L bottle", unitPriceCentavos: 18000, quantity: 2, subtotalCentavos: 36000 },
    ]);
    expect(res.body.history).toEqual([expect.objectContaining({ toStatus: "NEW", actorRole: "CUSTOMER" })]);
    expect(res.body).not.toHaveProperty("staffNote");
    expect(res.body).not.toHaveProperty("customerId");

    const order = await prisma.order.findUniqueOrThrow({ where: { orderNo: res.body.orderNo }, include: { history: true } });
    expect(order.history).toEqual([expect.objectContaining({ fromStatus: null, toStatus: "NEW", actorId: user.id })]);
    expect(await balance(milk.id)).toMatchObject({ physicalStock: 10, reservedStock: 3 }); // reserved, not deducted (08 #2)
    expect(await balance(cheese.id)).toMatchObject({ physicalStock: 5, reservedStock: 2 });
    const moves = await prisma.stockMovement.findMany({ where: { reference: res.body.orderNo }, orderBy: { productId: "asc" } });
    expect(moves.map((m) => [m.productId, m.type, m.quantity, m.actorId])).toEqual([[milk.id, "ORDER_RESERVED", 3, user.id], [cheese.id, "ORDER_RESERVED", 2, user.id]]);
    await expectBalanceMatchesMovements(milk.id);
    await expectBalanceMatchesMovements(cheese.id);
    expect((await agent.get("/api/cart")).body.lines).toEqual([]);

    // Public catalog shows the reservation as lower availability.
    const list = await request(app).get("/api/products");
    expect(list.body.find((p: { id: number }) => p.id === milk.id).available).toBe(7);
  });

  it("refuses an empty cart, delivery while it is disabled, and a bad phone number, changing nothing", async () => {
    const p = await createProduct({ stock: 3 });
    const { agent } = await signedInCustomer(app);
    expect((await checkout(agent)).body.code).toBe("cart_empty");
    await add(agent, p.id, 1);
    const del = await checkout(agent, { fulfillment: "DELIVERY", address: "Pili, Camarines Sur" });
    expect(del.status).toBe(400);
    expect(del.body.fields.fulfillment[0]).toMatch(/Delivery is not available/);
    expect((await checkout(agent, { contactNumber: "123" })).status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
    expect((await balance(p.id)).reservedStock).toBe(0);
  });

  describe("double submit", () => {
    it("the same operationKey twice in a row returns the first order and reserves once", async () => {
      const p = await createProduct({ stock: 10 });
      const { agent } = await signedInCustomer(app);
      await add(agent, p.id, 2);
      const body = { operationKey: randomUUID(), contactName: "Ana Cruz", contactNumber: "09171234567", fulfillment: "PICKUP", expectedTotalCentavos: 19000 };
      const first = await agent.post("/api/orders").send(body);
      const second = await agent.post("/api/orders").send(body);
      expect(first.status).toBe(201);
      expect(second.status).toBe(200);
      expect(second.body).toMatchObject({ orderNo: first.body.orderNo, replayed: true });
      expect(await prisma.order.count()).toBe(1);
      expect((await balance(p.id)).reservedStock).toBe(2);
    });

    it("the same operationKey sent five times at once creates exactly one order", async () => {
      const p = await createProduct({ stock: 10 });
      const { agent } = await signedInCustomer(app);
      await add(agent, p.id, 2);
      const body = { operationKey: randomUUID(), contactName: "Ana Cruz", contactNumber: "09171234567", fulfillment: "PICKUP", expectedTotalCentavos: 19000 };
      const all = await Promise.all(Array.from({ length: 5 }, () => agent.post("/api/orders").send(body)));
      expect(all.map((r) => r.status).sort()).toEqual([200, 200, 200, 200, 201]);
      expect(new Set(all.map((r) => r.body.orderNo)).size).toBe(1);
      expect(await prisma.order.count()).toBe(1);
      expect((await balance(p.id)).reservedStock).toBe(2);
      await expectBalanceMatchesMovements(p.id);
    });

    it("two tabs (different keys) submitting the same cart at once give one order; the other sees an empty cart", async () => {
      const p = await createProduct({ stock: 10 });
      const { agent } = await signedInCustomer(app);
      await add(agent, p.id, 2);
      const [a, b] = await Promise.all([checkout(agent), checkout(agent)]);
      expect([a.status, b.status].sort()).toEqual([201, 409]);
      expect([a.body.code, b.body.code]).toContain("cart_empty");
      expect(await prisma.order.count()).toBe(1);
      expect((await balance(p.id)).reservedStock).toBe(2);
    });

    it("another customer reusing someone's operationKey is refused and learns nothing about that order", async () => {
      const p = await createProduct({ stock: 10 });
      const ana = await signedInCustomer(app);
      const ben = await signedInCustomer(app);
      await add(ana.agent, p.id, 1);
      await add(ben.agent, p.id, 1);
      const key = randomUUID();
      expect((await checkout(ana.agent, { operationKey: key })).status).toBe(201);
      const res = await checkout(ben.agent, { operationKey: key });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("operation_key_conflict");
      expect(res.body).not.toHaveProperty("orderNo");
      expect((await ben.agent.get("/api/cart")).body.count).toBe(1);
    });
  });

  describe("price tampering", () => {
    it("ignores prices, totals and status sent by the client and stores the server price", async () => {
      const p = await createProduct({ stock: 10, priceCentavos: 9500 });
      const { agent } = await signedInCustomer(app);
      await add(agent, p.id, 2);
      const res = await checkout(agent, {
        totalCentavos: 1, status: "COMPLETED", customerId: 1,
        items: [{ productId: p.id, quantity: 999, unitPriceCentavos: 1, subtotalCentavos: 1 }],
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ status: "NEW", totalCentavos: 19000 });
      const item = await prisma.orderItem.findFirstOrThrow({ where: { order: { orderNo: res.body.orderNo } } });
      expect(item).toMatchObject({ unitPriceCentavos: 9500, quantity: 2, subtotalCentavos: 19000 });
    });

    it("refuses when the total the customer saw is not the server total, and changes nothing", async () => {
      const p = await createProduct({ stock: 10, priceCentavos: 9500 });
      const { agent } = await signedInCustomer(app);
      await add(agent, p.id, 2);
      const res = await checkout(agent, { expectedTotalCentavos: 100 });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ code: "price_changed", totalCentavos: 19000 });
      expect(await prisma.order.count()).toBe(0);
      expect((await balance(p.id)).reservedStock).toBe(0);
      expect((await agent.get("/api/cart")).body.count).toBe(2);
    });

    it("a price change after adding is caught at checkout; the order keeps its price when the product price changes later", async () => {
      const p = await createProduct({ stock: 10, priceCentavos: 9500 });
      const { agent } = await signedInCustomer(app);
      await add(agent, p.id, 2);
      const seen = (await agent.get("/api/cart")).body.totalCentavos;
      await prisma.product.update({ where: { id: p.id }, data: { priceCentavos: 9900 } });
      const stale = await agent.post("/api/orders").send({ operationKey: randomUUID(), contactName: "Ana Cruz", contactNumber: "09171234567", fulfillment: "PICKUP", expectedTotalCentavos: seen });
      expect(stale.body).toMatchObject({ code: "price_changed", totalCentavos: 19800 });

      const ok = await checkout(agent); // re-reviews the cart, so it sends 19800
      expect(ok.status).toBe(201);
      await prisma.product.update({ where: { id: p.id }, data: { priceCentavos: 12000 } });
      const stored = await agent.get(`/api/orders/${ok.body.orderNo}`);
      expect(stored.body.totalCentavos).toBe(19800);
      expect(stored.body.items[0].unitPriceCentavos).toBe(9900);
    });
  });

  describe("racing for stock", () => {
    it("two customers racing for the last unit: exactly one order, the other is told stock changed", async () => {
      const p = await createProduct({ stock: 1 });
      const ana = await signedInCustomer(app);
      const ben = await signedInCustomer(app);
      await add(ana.agent, p.id, 1);
      await add(ben.agent, p.id, 1); // both carts hold it: the cart check is advisory
      const [a, b] = await Promise.all([checkout(ana.agent), checkout(ben.agent)]);
      expect([a.status, b.status].sort()).toEqual([201, 409]);
      const lost = a.status === 409 ? a : b;
      expect(lost.body.code).toBe("stock_changed");
      expect(lost.body.problems).toEqual([expect.objectContaining({ productId: p.id, requested: 1, available: 0, problem: "out_of_stock" })]);
      expect(await prisma.order.count()).toBe(1);
      expect(await balance(p.id)).toMatchObject({ physicalStock: 1, reservedStock: 1 });
      await expectBalanceMatchesMovements(p.id);
    });

    it("eight customers, stock for three: exactly three orders, stock never over-reserved", async () => {
      const p = await createProduct({ stock: 3 });
      const other = await createProduct({ stock: 100 });
      const customers = await Promise.all(Array.from({ length: 8 }, () => signedInCustomer(app)));
      for (const c of customers) { await add(c.agent, other.id, 1); await add(c.agent, p.id, 1); } // two lines: exercises lock ordering
      const results = await Promise.all(customers.map((c) => checkout(c.agent)));
      expect(results.map((r) => r.status).sort()).toEqual([201, 201, 201, 409, 409, 409, 409, 409]); // no 500s
      expect(results.filter((r) => r.status === 409).map((r) => r.body.code)).toEqual(Array(5).fill("stock_changed"));
      expect(await balance(p.id)).toMatchObject({ physicalStock: 3, reservedStock: 3 });
      expect(await balance(other.id)).toMatchObject({ reservedStock: 3 }); // losers reserved nothing on any line
      await expectBalanceMatchesMovements(p.id);
      await expectBalanceMatchesMovements(other.id);
    });

    it("stock changed since adding: checkout refuses, the cart is kept and shows what to fix", async () => {
      const p = await createProduct({ stock: 5, name: "Fresh Milk" });
      const { agent } = await signedInCustomer(app);
      await add(agent, p.id, 5);
      // Someone else's order reserves 3 in the meantime.
      await prisma.$transaction(async (tx) => {
        await tx.stockMovement.create({ data: { productId: p.id, type: "ORDER_RESERVED", quantity: 3, reference: "TEST-OTHER", reason: "Other order" } });
        await tx.inventoryBalance.update({ where: { productId: p.id }, data: { reservedStock: { increment: 3 } } });
      });

      const res = await checkout(agent, { expectedTotalCentavos: 5 * 9500 });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("stock_changed");
      expect(res.body.problems).toEqual([{ productId: p.id, name: "Fresh Milk", requested: 5, available: 2, problem: "over_available", message: "Only 2 left. Lower the quantity to continue." }]);
      const cart = (await agent.get("/api/cart")).body;
      expect(cart).toMatchObject({ canCheckout: false, count: 5 });
      expect(cart.lines[0]).toMatchObject({ problem: "over_available", available: 2 });

      expect((await agent.patch(`/api/cart/items/${p.id}`).send({ quantity: 2 })).status).toBe(200);
      expect((await checkout(agent)).status).toBe(201);
      expect(await balance(p.id)).toMatchObject({ physicalStock: 5, reservedStock: 5 });
    });

    it("a product retired after adding blocks checkout until removed", async () => {
      const p = await createProduct({ stock: 5 });
      const { agent } = await signedInCustomer(app);
      await add(agent, p.id, 1);
      await prisma.product.update({ where: { id: p.id }, data: { isActive: false } });
      const res = await checkout(agent);
      expect(res.body.problems[0].problem).toBe("unavailable");
      expect(await prisma.order.count()).toBe(0);
    });
  });
});

describe("order receipt", () => {
  it("a customer can read their own order; another customer gets the same 404 as a missing order", async () => {
    const p = await createProduct({ stock: 5 });
    const ana = await signedInCustomer(app);
    const ben = await signedInCustomer(app);
    await add(ana.agent, p.id, 1);
    const placed = await checkout(ana.agent);
    const own = await ana.agent.get(`/api/orders/${placed.body.orderNo}`);
    expect(own.status).toBe(200);
    expect(own.body.orderNo).toBe(placed.body.orderNo);
    expect(own.body).not.toHaveProperty("staffNote");
    const theirs = await ben.agent.get(`/api/orders/${placed.body.orderNo}`);
    const missing = await ben.agent.get("/api/orders/FF-260101-ZZZZZ");
    expect(theirs.status).toBe(404);
    expect(theirs.body).toEqual(missing.body);
  });
});

describe("database CHECK constraints (last line of defence)", () => {
  it("refuse reserved above physical, negative stock and zero quantities", async () => {
    const p = await createProduct({ stock: 2 });
    await expect(prisma.$executeRaw`UPDATE \`InventoryBalance\` SET \`reservedStock\` = 3 WHERE \`productId\` = ${p.id}`).rejects.toThrow();
    await expect(prisma.$executeRaw`UPDATE \`InventoryBalance\` SET \`physicalStock\` = -1, \`reservedStock\` = 0 WHERE \`productId\` = ${p.id}`).rejects.toThrow();
    await expect(prisma.stockMovement.create({ data: { productId: p.id, type: "STOCK_IN", quantity: 0, reference: "X" } })).rejects.toThrow();
    await expect(prisma.product.update({ where: { id: p.id }, data: { priceCentavos: -1 } })).rejects.toThrow();
    expect(await balance(p.id)).toMatchObject({ physicalStock: 2, reservedStock: 0 });
  });
});
