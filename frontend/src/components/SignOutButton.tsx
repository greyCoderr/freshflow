import { useState, type ReactNode } from "react";
import { useSession } from "../lib/session";

/** One sign-out control for every place that offers it: busy state, and a message if the server cannot be reached. */
export function SignOutButton({ className, children = "Sign out" }: { className?: string; children?: ReactNode }) {
  const { signOut } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <>
      <button type="button" className={className} disabled={busy} aria-busy={busy || undefined}
        onClick={async () => {
          setBusy(true); setErr("");
          try { await signOut(); } catch { setErr("Could not sign out. Check your connection, then try again."); setBusy(false); }
        }}>
        {children}
      </button>
      {err && <p role="alert" className="signout-err">{err}</p>}
    </>
  );
}
