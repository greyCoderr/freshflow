import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { loginSchema, registerSchema } from "@freshflow/shared";
import { prisma } from "../db.js";
import { COOKIE, signSession } from "../lib/session.js";
import { HttpError } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import type { loadEnv } from "../env.js";

type Env = ReturnType<typeof loadEnv>;
const GENERIC = "Incorrect email/username or password.";
const MAX_FAILS = 5, LOCK_MIN = 15;

export function authRoutes(env: Env) {
  const r = Router();
  const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Too many attempts. Try again later." } });
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: env.COOKIE_SECURE, maxAge: env.SESSION_HOURS * 3_600_000, path: "/" };

  r.post("/login", limiter, async (req, res) => {
    const { identifier, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] }, include: { role: true } });
    // Always run a hash compare so timing does not reveal whether the account exists.
    const ok = await bcrypt.compare(password, user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi");
    if (!user || user.status !== "ACTIVE" || (user.lockedUntil && user.lockedUntil > new Date())) throw new HttpError(401, GENERIC, "bad_credentials");
    if (!ok) {
      const fails = user.failedLogins + 1;
      await prisma.user.update({ where: { id: user.id }, data: { failedLogins: fails, lockedUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MIN * 60_000) : null } });
      throw new HttpError(401, GENERIC, "bad_credentials");
    }
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    const token = await signSession({ uid: user.id, role: user.role.name as never, sv: user.sessionVersion }, env.JWT_SECRET, env.SESSION_HOURS);
    res.cookie(COOKIE, token, cookieOpts);
    res.json({ id: user.id, fullName: user.fullName, role: user.role.name, mustChangePassword: user.mustChangePassword });
  });

  r.post("/register", limiter, async (req, res) => {
    const d = registerSchema.parse(req.body);
    if (await prisma.user.findUnique({ where: { email: d.email } })) throw new HttpError(409, "That email is already registered.", "email_taken");
    const role = await prisma.role.findUniqueOrThrow({ where: { name: "CUSTOMER" } }); // role is never taken from the client
    const user = await prisma.user.create({
      data: { roleId: role.id, fullName: d.fullName, email: d.email, passwordHash: await bcrypt.hash(d.password, 10),
        customer: { create: { contactNumber: d.contactNumber } } },
    });
    res.status(201).json({ id: user.id });
  });

  r.post("/logout", async (_req, res) => { res.clearCookie(COOKIE, { path: "/" }); res.json({ ok: true }); });
  r.get("/me", requireAuth, (req, res) => res.json({ id: req.user!.id, fullName: req.user!.fullName, role: req.user!.role, permissions: req.user!.permissions }));
  return r;
}
