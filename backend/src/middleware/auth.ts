import type { NextFunction, Request, Response } from "express";
import { DEFAULT_ROLE_PERMISSIONS, type Permission, type RoleName } from "@freshflow/shared";
import { prisma } from "../db.js";
import { COOKIE, readSession } from "../lib/session.js";
import { HttpError } from "../lib/http.js";

export interface AuthUser { id: number; role: RoleName; fullName: string; permissions: readonly Permission[] }
declare module "express-serve-static-core" { interface Request { user?: AuthUser } }

/** Loads the user from the DB on every request, so deactivation and role changes apply immediately. */
export function loadUser(secret: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.[COOKIE];
    if (!token) return next();
    const s = await readSession(token, secret);
    if (!s) return next();
    const u = await prisma.user.findUnique({ where: { id: s.uid }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
    if (!u || u.status !== "ACTIVE" || u.sessionVersion !== s.sv) return next();
    const name = u.role.name as RoleName;
    const fromDb = u.role.permissions.map((p) => p.permission.code as Permission);
    req.user = { id: u.id, role: name, fullName: u.fullName, permissions: name === "ADMIN" ? DEFAULT_ROLE_PERMISSIONS.ADMIN : fromDb };
    next();
  };
}
export const requireAuth = (req: Request, _res: Response, next: NextFunction) =>
  req.user ? next() : next(new HttpError(401, "Please sign in again.", "session_expired"));
export const requirePermission = (...needed: Permission[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new HttpError(401, "Please sign in again.", "session_expired"));
  if (!needed.every((p) => req.user!.permissions.includes(p))) return next(new HttpError(403, "You do not have access to this.", "forbidden"));
  next();
};
