import type { ReactNode } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { homePathFor, isStaffRole, type Permission } from "@freshflow/shared";
import { useSession } from "../lib/session";
import { safeNext } from "../lib/api";
import { Forbidden } from "../pages/Forbidden";

function SessionLoading() {
  return <p role="status" className="session-wait">Loading your account…</p>;
}
function SessionError() {
  const s = useSession();
  return (
    <div role="alert" className="session-wait">
      <p>{s.error?.message ?? "Could not load your account."}</p>
      <button className="btn ghost" onClick={s.retry}>Try again</button>
    </div>
  );
}

/** Signed in; a pending temporary-password change sends the user to /change-password first. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const s = useSession();
  const loc = useLocation();
  if (s.loading) return <SessionLoading />;
  if (s.error) return <SessionError />;
  if (!s.user) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}${s.expired ? "&expired=1" : ""}`} replace />;
  }
  if (s.user.mustChangePassword && loc.pathname !== "/change-password") return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

/** The server checks again on every request; this only decides what to render. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const s = useSession();
  return s.can(permission) ? <>{children}</> : <Forbidden />;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const s = useSession();
  if (s.user && isStaffRole(s.user.role)) return <>{children}</>;
  return <><header className="top"><div className="wrap"><Link className="brand" to="/">FreshFlow</Link></div></header><main id="main"><Forbidden /></main></>;
}

/** Login and register: a signed-in user is sent to their home instead. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const s = useSession();
  const [params] = useSearchParams();
  if (s.loading) return <SessionLoading />;
  // Same destination the login page picks, so the two never disagree.
  if (s.user) return <Navigate to={s.user.mustChangePassword ? "/change-password" : safeNext(params.get("next")) ?? homePathFor(s.user.role)} replace />;
  return <>{children}</>;
}
