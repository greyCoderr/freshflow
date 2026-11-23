import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Sign-in, register and password pages: a receipt slip on the ivory page, under the co-op wordmark. */
export function AuthCard({ title, lead, children, wide }: { title: string; lead?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="auth-page">
      <header className="auth-mast">
        <Link to="/" className="brand">FreshFlow</Link>
        <span className="mono auth-coop">Bicol Federation of Dairy Cooperative</span>
      </header>
      <main className={`slip auth-slip${wide ? " wide" : ""}`}>
        <h1>{title}</h1>
        {lead && <p className="auth-lead">{lead}</p>}
        {children}
      </main>
    </div>
  );
}
