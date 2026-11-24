import { Router, type Express } from "express";
import { API_GUARDS } from "@freshflow/shared";
import { requirePermission } from "../middleware/auth.js";
import type { Env } from "../env.js";
import { userRoutes } from "./users.js";
import { cartRoutes } from "./cart.js";
import { orderRoutes } from "./orders.js";

/** Areas not built yet still sit behind their permission guard, so access rules are fixed (and tested) now. */
const notBuilt = Router().use((_req, res) => { res.status(501).json({ error: "This section is not available yet.", code: "not_built" }); });

export function mountGuardedAreas(app: Express, env: Env) {
  const built: Partial<Record<(typeof API_GUARDS)[number]["path"], Router>> = {
    "/api/users": userRoutes(env),
    "/api/cart": cartRoutes(),
    // 0003 builds placing an order and its receipt; list, tracking and cancel arrive in 0004 (still 501 until then).
    "/api/orders": Router().use(orderRoutes(), notBuilt),
  };
  for (const g of API_GUARDS) app.use(g.path, requirePermission(g.permission), built[g.path] ?? notBuilt);
}
