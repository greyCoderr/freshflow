import { useState } from "react";
import { ROLE_LABELS } from "@freshflow/shared";
import { useSession } from "../lib/session";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { SignOutButton } from "../components/SignOutButton";

export function Account() {
  const s = useSession();
  const [saved, setSaved] = useState(false);
  const u = s.user!;
  return (
    <div className="narrow">
      <h1>Account</h1>
      <dl className="facts">
        <div><dt>Name</dt><dd>{u.fullName}</dd></div>
        <div><dt>Email</dt><dd>{u.email}</dd></div>
        {u.username && <div><dt>Username</dt><dd className="mono">{u.username}</dd></div>}
        <div><dt>Account type</dt><dd>{ROLE_LABELS[u.role]}</dd></div>
      </dl>
      <section aria-labelledby="pw-h" className="ruled-section">
        <h2 id="pw-h">Change password</h2>
        {saved && <p className="notice ok" role="status">Password changed. Other devices were signed out.</p>}
        <ChangePasswordForm onDone={async () => { await s.refresh(); setSaved(true); }} />
      </section>
      <section className="ruled-section">
        <SignOutButton className="btn ghost" />
      </section>
    </div>
  );
}
