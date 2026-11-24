import { Router } from "express";
import { z } from "zod";
import { checkoutSchema } from "@freshflow/shared";
import { requirePermission } from "../middleware/auth.js";
import { HttpError } from "../lib/http.js";
import { findCustomerOrder, placeOrder } from "../services/checkout.js";

// Mounted behind requirePermission("order.view_own") (API_GUARDS). Placing also needs order.place.
// Patch 0004 adds the order list, tracking and cancel here.
const orderNoParam = z.object({ orderNo: z.string().regex(/^FF-\d{6}-[2-9A-Z]{5}$/) });

export function orderRoutes() {
  const r = Router();

  r.post("/", requirePermission("order.place"), async (req, res) => {
    const input = checkoutSchema.parse(req.body);
    const { order, replayed } = await placeOrder({ id: req.user!.id, role: req.user!.role }, input);
    // A repeated submit with the same operationKey gets the first result back, with 200 instead of 201.
    res.status(replayed ? 200 : 201).json({ ...order, replayed });
  });

  // Own orders only. Another customer's order number answers 404, exactly like one that does not exist.
  r.get("/:orderNo", async (req, res) => {
    const p = orderNoParam.safeParse(req.params);
    const order = p.success ? await findCustomerOrder(req.user!.id, p.data.orderNo) : null;
    if (!order) throw new HttpError(404, "We could not find that order in your account.", "not_found");
    res.json(order);
  });
  return r;
}
