import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { changePasswordSchema, loginSchema, registerSchema, type RoleName } from "@freshflow/shared";
import { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../db.js";
import { COOKIE, signSession } from "../lib/session.js";
import { HttpError } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import { requireAuth } from "../middleware/auth.js";
import type { Env } from "../env.js";

/** One message for unknown account, wrong password, deactivated and locked, so none of them can be told apart. */
export const GENERIC_LOGIN_ERROR = "Incorrect email/username or password. After 5 wrong tries, sign-in pauses for 15 minutes.";
export const MAX_FAILS = 5;
export const LOCK_MIN = 15;
export const BCRYPT_COST = 10;
// Compared when the account does not exist, so response time does not reveal whether it exists.
const DUMMY_HASH = bcrypt.hashSync("no-such-account-placeholder", BCRYPT_COST);

export function authRoutes(env: Env) {
  const r = Router();
  const limiter = rateLimit({ windowMs: 15 * 60_000, limit: env.AUTH_RATE_LIMIT, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many attempts from this device. Wait 15 minutes, then try again.", code: "rate_limited" } });
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: env.COOKIE_SECURE, maxAge: env.SESSION_HOURS * 3_600_000, path: "/" };

  async function startSession(res: Response, u: { id: number; sessionVersion: number }, role: RoleName) {
    res.cookie(COOKIE, await signSession({ uid: u.id, role, sv: u.sessionVersion }, env.JWT_SECRET, env.SESSION_HOURS), cookieOpts);
  }

  r.post("/login", limiter, async (req, res) => {
    const { identifier, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] }, include: { role: true } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    const now = new Date();
    if (!user || user.status !== "ACTIVE") throw new HttpError(401, GENERIC_LOGIN_ERROR, "bad_credentials");
    if (user.lockedUntil && user.lockedUntil > now) throw new HttpError(401, GENERIC_LOGIN_ERROR, "bad_credentials");
    if (!ok) {
      // A lock that has run out starts the count again.
      const base = user.lockedUntil && user.lockedUntil <= now ? 0 : user.failedLogins;
      const fails = base + 1;
      const lock = fails >= MAX_FAILS;
      await prisma.user.update({ where: { id: user.id }, data: { failedLogins: fails, lockedUntil: lock ? new Date(now.getTime() + LOCK_MIN * 60_000) : null } });
      if (lock) await audit(prisma, req, { actorId: null, action: "auth.locked", targetType: "User", targetId: user.id, summary: `${MAX_FAILS} failed sign-ins; locked ${LOCK_MIN} min` });
      throw new HttpError(401, GENERIC_LOGIN_ERROR, "bad_credentials");
    }
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    await startSession(res, user, user.role.name as RoleName);
    res.json({ id: user.id, fullName: user.fullName, role: user.role.name, mustChangePassword: user.mustChangePassword });
  });

  r.post("/register", limiter, async (req, res) => {
    // Unknown keys (role, roleId, status, permissions...) are stripped by the schema; the role is always CUSTOMER.
    const d = registerSchema.parse(req.body);
    const role = await prisma.role.findUniqueOrThrow({ where: { name: "CUSTOMER" } });
    const passwordHash = await bcrypt.hash(d.password, BCRYPT_COST);
    let user;
    try {
      user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { roleId: role.id, fullName: d.fullName, email: d.email, passwordHash,
            customer: { create: { contactNumber: d.contactNumber } } },
        });
        await audit(tx, req, { actorId: u.id, action: "customer.registered", targetType: "User", targetId: u.id, summary: "role=CUSTOMER" });
        return u;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError(409, "That email is already registered. Sign in instead.", "email_taken");
      throw e;
    }
    await startSession(res, user, "CUSTOMER");
    res.status(201).json({ id: user.id, fullName: user.fullName, role: "CUSTOMER", mustChangePassword: false });
  });

  r.post("/change-password", requireAuth, limiter, async (req, res) => {
    const d = changePasswordSchema.parse(req.body);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    if (!(await bcrypt.compare(d.currentPassword, u.passwordHash))) {
      throw new HttpError(400, "Please check the highlighted fields.", "validation", { currentPassword: ["Current password is not correct"] });
    }
    if (d.newPassword === env.DEFAULT_PASSWORD) {
      throw new HttpError(400, "Please check the highlighted fields.", "validation", { newPassword: ["Do not reuse the temporary password"] });
    }
    // Bumping the session version signs out every other device; this device gets a fresh cookie below.
    const passwordHash = await bcrypt.hash(d.newPassword, BCRYPT_COST);
    const updated = await prisma.$transaction(async (tx) => {
      const x = await tx.user.update({ where: { id: u.id }, data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } } });
      await audit(tx, req, { actorId: u.id, action: "auth.password_changed", targetType: "User", targetId: u.id, summary: u.mustChangePassword ? "temporary password replaced" : "password changed" });
      return x;
    });
    await startSession(res, updated, req.user!.role);
    res.json({ ok: true });
  });

  // Signing out ends every session of this account (session version bump), not just this browser's cookie.
  r.post("/logout", async (req, res) => {
    if (req.user) await prisma.user.update({ where: { id: req.user.id }, data: { sessionVersion: { increment: 1 } } });
    res.clearCookie(COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  r.get("/me", requireAuth, (req, res) => {
    const u = req.user!;
    res.json({ id: u.id, fullName: u.fullName, email: u.email, username: u.username, role: u.role, permissions: u.permissions, mustChangePassword: u.mustChangePassword });
  });
  return r;
}
