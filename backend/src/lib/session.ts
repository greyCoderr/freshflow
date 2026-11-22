import { SignJWT, jwtVerify } from "jose";
import type { RoleName } from "@freshflow/shared";
export interface SessionClaims { uid: number; role: RoleName; sv: number }
export const COOKIE = "ff_session";
const key = (secret: string) => new TextEncoder().encode(secret);
export async function signSession(c: SessionClaims, secret: string, hours: number) {
  return new SignJWT({ role: c.role, sv: c.sv }).setProtectedHeader({ alg: "HS256" }).setSubject(String(c.uid))
    .setIssuedAt().setExpirationTime(`${hours}h`).sign(key(secret));
}
export async function readSession(token: string, secret: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    return { uid: Number(payload.sub), role: payload.role as RoleName, sv: Number(payload.sv) };
  } catch { return null; }
}
