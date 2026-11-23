import { useNavigate } from "react-router-dom";
import { homePathFor } from "@freshflow/shared";
import { useSession } from "../lib/session";
import { AuthCard } from "../components/AuthCard";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { SignOutButton } from "../components/SignOutButton";

/** Reached after signing in with a temporary password; every other page redirects here until it is done. */
export function ChangePassword() {
  const s = useSession();
  const nav = useNavigate();
  const forced = !!s.user?.mustChangePassword;
  return (
    <AuthCard title={forced ? "Set your own password" : "Change password"}
      lead={forced ? "Your account was opened with a temporary password. Choose your own before you continue." : undefined}>
      <ChangePasswordForm forced={forced} onDone={async () => { const u = await s.refresh(); nav(u ? homePathFor(u.role) : "/login", { replace: true }); }} />
      <div className="auth-foot">
        <SignOutButton className="linklike">Sign out instead</SignOutButton>
      </div>
    </AuthCard>
  );
}
