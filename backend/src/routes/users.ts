import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createUserSchema } from "@freshflow/shared";
import { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../db.js";
import { HttpError } from "../lib/http.js";
import { audit } from "../lib/audit.js";
import type { Env } from "../env.js";
import { BCRYPT_COST } from "./auth.js";

// Mounted behind requirePermission("user.manage") (see API_GUARDS). Full admin screens arrive in patch 0011.
// Never select passwordHash: admins can never see or recover passwords.
const publicFields = { id: true, fullName: true, email: true, username: true, status: true, mustChangePassword: true, createdAt: true, role: { select: { name: true } } } as const;
const idParam = z.object({ id: z.coerce.number().int().positive() });

export function userRoutes(env: Env) {
  const r = Router();

  r.get("/", async (_req, res) => {
    const rows = await prisma.user.findMany({ select: publicFields, orderBy: [{ status: "asc" }, { fullName: "asc" }] });
    res.json(rows.map(({ role, ...u }) => ({ ...u, role: role.name })));
  });

  r.post("/", async (req, res) => {
    const d = createUserSchema.parse(req.body);
    const role = await prisma.role.findUniqueOrThrow({ where: { name: d.role } });
    const passwordHash = await bcrypt.hash(env.DEFAULT_PASSWORD, BCRYPT_COST);
    try {
      const u = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { roleId: role.id, fullName: d.fullName, email: d.email, username: d.username ?? null, passwordHash, mustChangePassword: true },
          select: publicFields,
        });
        await audit(tx, req, { actorId: req.user!.id, action: "user.created", targetType: "User", targetId: u.id, summary: `role=${d.role}; temporary password set` });
        return u;
      });
      res.status(201).json({ ...u, role: u.role.name });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const field = String((e.meta?.target as string | string[] | undefined) ?? "").includes("username") ? "username" : "email";
        throw new HttpError(409, "Please check the highlighted fields.", "duplicate", { [field]: [`That ${field} is already in use`] });
      }
      throw e;
    }
  });

  r.post("/:id/deactivate", async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (id === req.user!.id) throw new HttpError(409, "You cannot deactivate your own account.", "self_deactivate");
    await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id }, include: { role: true } });
      if (!u) throw new HttpError(404, "That account was not found.", "not_found");
      if (u.status === "INACTIVE") return;
      if (u.role.name === "ADMIN") {
        const admins = await tx.user.count({ where: { status: "ACTIVE", role: { name: "ADMIN" } } });
        if (admins <= 1) throw new HttpError(409, "This is the last active administrator. Add another administrator first.", "last_admin");
      }
      // Session version bump: any open session of this account stops working on its next request.
      await tx.user.update({ where: { id }, data: { status: "INACTIVE", sessionVersion: { increment: 1 } } });
      await audit(tx, req, { actorId: req.user!.id, action: "user.deactivated", targetType: "User", targetId: id, summary: "status ACTIVE -> INACTIVE" });
    });
    res.json({ ok: true });
  });

  r.post("/:id/activate", async (req, res) => {
    const { id } = idParam.parse(req.params);
    await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id } });
      if (!u) throw new HttpError(404, "That account was not found.", "not_found");
      if (u.status === "ACTIVE") return;
      await tx.user.update({ where: { id }, data: { status: "ACTIVE", failedLogins: 0, lockedUntil: null } });
      await audit(tx, req, { actorId: req.user!.id, action: "user.activated", targetType: "User", targetId: id, summary: "status INACTIVE -> ACTIVE" });
    });
    res.json({ ok: true });
  });
  return r;
}
