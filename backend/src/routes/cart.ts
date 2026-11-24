import { Router } from "express";
import { z } from "zod";
import { cartLineSchema, cartQuantitySchema } from "@freshflow/shared";
import { addToCart, cartView, removeFromCart, setCartQuantity } from "../services/cart.js";

// Mounted behind requirePermission("order.place") (API_GUARDS). Every change answers with the whole cart,
// so the UI never computes totals or availability itself.
const productParam = z.object({ productId: z.coerce.number().int().positive() });

export function cartRoutes() {
  const r = Router();
  r.get("/", async (req, res) => { res.json(await cartView(req.user!.id)); });

  r.post("/items", async (req, res) => {
    const { productId, quantity } = cartLineSchema.parse(req.body);
    await addToCart(req.user!.id, productId, quantity);
    res.json(await cartView(req.user!.id));
  });

  r.patch("/items/:productId", async (req, res) => {
    const { productId } = productParam.parse(req.params);
    const { quantity } = cartQuantitySchema.parse(req.body);
    await setCartQuantity(req.user!.id, productId, quantity);
    res.json(await cartView(req.user!.id));
  });

  r.delete("/items/:productId", async (req, res) => {
    const { productId } = productParam.parse(req.params);
    await removeFromCart(req.user!.id, productId);
    res.json(await cartView(req.user!.id));
  });
  return r;
}
