import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Permission, RoleName } from "@freshflow/shared";
import { api, ApiError, PASSWORD_CHANGE_EVENT, post, SESSION_EXPIRED_EVENT } from "./api";

export interface SessionUser {
  id: number; fullName: string; email: string; username: string | null;
  role: RoleName; permissions: Permission[]; mustChangePassword: boolean;
}
interface SessionValue {
  user: SessionUser | null;
  loading: boolean;
  error: ApiError | null;
  /** True after a request found the session gone (shown as "your session ended" on the login page). */
  expired: boolean;
  can: (p: Permission) => boolean;
  refresh: () => Promise<SessionUser | null>;
  signOut: () => Promise<void>;
  retry: () => void;
}
const Ctx = createContext<SessionValue | null>(null);
const ME = ["me"] as const;

async function fetchMe(): Promise<SessionUser | null> {
  try { return await api<SessionUser>("/auth/me"); }
  catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e; }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ME, queryFn: fetchMe, staleTime: 5 * 60_000, retry: false });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const onExpired = () => { if (qc.getQueryData(ME)) setExpired(true); qc.setQueryData(ME, null); };
    const onPw = () => { void qc.invalidateQueries({ queryKey: ME }); };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    window.addEventListener(PASSWORD_CHANGE_EVENT, onPw);
    return () => { window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired); window.removeEventListener(PASSWORD_CHANGE_EVENT, onPw); };
  }, [qc]);

  const refresh = useCallback(async () => {
    setExpired(false);
    const u = await fetchMe();
    qc.setQueryData(ME, u);
    return u;
  }, [qc]);

  /**
   * Ends the session on the server, then does a full page load of /login. The full load drops every
   * cached query and all in-memory state (important on shared POS/office PCs) and avoids racing the
   * route guards' own redirects. If the server cannot be reached, it throws and nothing is cleared,
   * so the user is never shown a login page while still signed in.
   */
  const signOut = useCallback(async () => {
    await post("/auth/logout");
    qc.clear();
    window.location.replace("/login");
    await new Promise(() => {}); // the page is unloading; keep callers in their busy state
  }, [qc]);

  const value = useMemo<SessionValue>(() => {
    const user = q.data ?? null;
    return {
      user, loading: q.isPending, error: q.error instanceof ApiError ? q.error : q.error ? new ApiError(0, "Could not load your account.") : null,
      expired, can: (p) => !!user?.permissions.includes(p), refresh, signOut, retry: () => void q.refetch(),
    };
  }, [q.data, q.isPending, q.error, expired, refresh, signOut, q]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}
