import { describe, expect, it } from "vitest";
import { canMoveOrder, nextOrderStatuses, canMoveConcern, toCentavos, formatPeso, DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, checkoutSchema,
  cartLineSchema, cartLineProblem, stockLimitMessage, MOVEMENT_EFFECT, MOVEMENT_TYPES } from "../src/index.js";

describe("order state machine", () => {
  it("allows only listed transitions", () => {
    expect(canMoveOrder("NEW", "CONFIRMED", false)).toBe(true);
    expect(canMoveOrder("NEW", "COMPLETED", false)).toBe(false);
    expect(canMoveOrder("COMPLETED", "CANCELLED", true)).toBe(false);
  });
  it("hides Out for Delivery when delivery is disabled", () => {
    expect(nextOrderStatuses("PREPARING", false)).toEqual(["READY_FOR_PICKUP", "CANCELLED"]);
    expect(nextOrderStatuses("PREPARING", true)).toContain("OUT_FOR_DELIVERY");
  });
});
describe("concern state machine", () => {
  it("follows the table", () => {
    expect(canMoveConcern("OPEN", "IN_REVIEW")).toBe(true);
    expect(canMoveConcern("OPEN", "RESPONDED")).toBe(false);
    expect(canMoveConcern("RESOLVED", "OPEN")).toBe(false);
  });
});
describe("money", () => {
  it("converts exactly", () => { expect(toCentavos("95.10")).toBe(9510); expect(toCentavos(0.1 + 0.2)).toBe(30); });
  it("rejects bad input", () => { expect(() => toCentavos("1.234")).toThrow(); expect(() => toCentavos("-5")).toThrow(); });
  it("formats", () => expect(formatPeso(123456)).toBe("₱1,234.56"));
});
describe("roles", () => {
  it("customers cannot manage anything", () => {
    for (const p of DEFAULT_ROLE_PERMISSIONS.CUSTOMER) expect(["order.place", "order.view_own", "concern.submit"]).toContain(p);
  });
  it("only admin manages users and roles", () => {
    for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      if (role !== "ADMIN") { expect(perms).not.toContain("user.manage"); expect(perms).not.toContain("role.manage"); }
    }
    expect(DEFAULT_ROLE_PERMISSIONS.ADMIN.length).toBe(PERMISSIONS.length);
  });
});
describe("checkout schema", () => {
  const base = { operationKey: "3f8c7b52-1c3a-4a67-9d7e-9b8a1a2b3c4d", contactName: "Ana Cruz", contactNumber: "09171234567", expectedTotalCentavos: 9500 };
  it("requires address for delivery", () => {
    expect(checkoutSchema.safeParse({ ...base, fulfillment: "DELIVERY" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, fulfillment: "PICKUP" }).success).toBe(true);
  });
  it("strips client-sent prices, totals and status", () => {
    const r = checkoutSchema.parse({ ...base, fulfillment: "PICKUP", totalCentavos: 1, status: "COMPLETED", items: [{ productId: 1, unitPriceCentavos: 1 }] });
    expect(r).not.toHaveProperty("totalCentavos");
    expect(r).not.toHaveProperty("status");
    expect(r).not.toHaveProperty("items");
  });
  it("requires the total the customer saw, and a real PH mobile number", () => {
    const { expectedTotalCentavos: _drop, ...noTotal } = base;
    expect(checkoutSchema.safeParse({ ...noTotal, fulfillment: "PICKUP" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, fulfillment: "PICKUP", contactNumber: "12345" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, fulfillment: "PICKUP", operationKey: "not-a-uuid" }).success).toBe(false);
  });
});
describe("cart rules", () => {
  it("rejects zero, negative, fractional and non-numeric quantities", () => {
    for (const quantity of [0, -1, 1.5, "2", Number.NaN, 1001]) expect(cartLineSchema.safeParse({ productId: 1, quantity }).success).toBe(false);
    expect(cartLineSchema.safeParse({ productId: 1, quantity: 3 }).success).toBe(true);
  });
  it("names the problem with a cart line", () => {
    expect(cartLineProblem(false, 10, 1)).toBe("unavailable");
    expect(cartLineProblem(true, 0, 1)).toBe("out_of_stock");
    expect(cartLineProblem(true, 2, 3)).toBe("over_available");
    expect(cartLineProblem(true, 3, 3)).toBeNull();
  });
  it("says what to do next", () => {
    expect(stockLimitMessage(4)).toBe("Only 4 left. Lower the quantity to continue.");
    expect(stockLimitMessage(4, 2)).toBe("Only 4 left, and 2 are already in your cart.");
    expect(stockLimitMessage(0)).toBe("Out of stock right now.");
  });
});
describe("movements", () => {
  it("every type has an effect; a reservation moves reserved stock only", () => {
    for (const t of MOVEMENT_TYPES) expect(MOVEMENT_EFFECT[t]).toBeDefined();
    expect(MOVEMENT_EFFECT.ORDER_RESERVED).toEqual({ physical: 0, reserved: 1 });
  });
});
