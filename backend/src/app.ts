import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pino } from "pino";
import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import path from "node:path";
import { existsSync } from "node:fs";
import { loadEnv } from "./env.js";
import { prisma } from "./db.js";
import { HttpError } from "./lib/http.js";
import { loadUser } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { productRoutes } from "./routes/products.js";
import { mountGuardedAreas } from "./routes/areas.js";

export function createApp(env = loadEnv()) {
  const app = express();
  const logger = pino({ level: env.NODE_ENV === "test" ? "silent" : "info", redact: ["req.headers.cookie", "req.headers.authorization", "req.body.password", "req.body.currentPassword", "req.body.newPassword", "res.headers[\"set-cookie\"]"] });
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(pinoHttp({ logger, genReqId: () => randomUUID() }));
  app.use(helmet());
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api", rateLimit({ windowMs: 15 * 60_000, limit: 600, standardHeaders: true, legacyHeaders: false }));
  app.use("/api", loadUser(env.JWT_SECRET));

  app.get("/api/health", async (_req, res) => {
    try { await prisma.$queryRaw`SELECT 1`; res.json({ ok: true, db: "up" }); } catch { res.status(503).json({ ok: false, db: "down" }); }
  });
  app.use("/api/auth", authRoutes(env));
  app.use("/api/products", productRoutes);
  mountGuardedAreas(app, env); // every area in API_GUARDS, each behind its permission
  app.use("/api", (_req, res) => { res.status(404).json({ error: "Not found.", code: "not_found" }); });

  const dist = path.resolve(process.cwd(), "frontend/dist");
  if (existsSync(dist)) { app.use(express.static(dist)); app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html"))); }

  const onError: ErrorRequestHandler = (err, req, res, _next) => {
    if (err instanceof ZodError) { res.status(400).json({ error: "Please check the highlighted fields.", code: "validation", fields: err.flatten().fieldErrors }); return; }
    if (err instanceof HttpError) { res.status(err.status).json({ error: err.message, code: err.code, ...(err.fields ? { fields: err.fields } : {}) }); return; }
    req.log.error({ name: err?.name, code: err?.code }, "unhandled error"); // never log request bodies
    res.status(500).json({ error: "Something went wrong on our side. Please try again." });
  };
  app.use(onError);
  return app;
}
