import { Router, type Express } from "express";
import { API_GUARDS } from "@freshflow/shared";
import { requirePermission } from "../middleware/auth.js";
import type { Env } from "../env.js";
import { userRoutes } from "./users.js";

/** Areas not built yet still sit behind their permission guard, so access rules are fixed (and tested) now. */
const notBuilt = Router().use((_req, res) => { res.status(501).json({ error: "This section is not available yet.", code: "not_built" }); });

export function mountGuardedAreas(app: Express, env: Env) {
  const built: Partial<Record<(typeof API_GUARDS)[number]["path"], Router>> = {
    "/api/users": userRoutes(env),
  };
  for (const g of API_GUARDS) app.use(g.path, requirePermission(g.permission), built[g.path] ?? notBuilt);
}
