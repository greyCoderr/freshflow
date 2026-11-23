import { Link, useLocation } from "react-router-dom";
import { homePathFor } from "@freshflow/shared";
import { useSession } from "../lib/session";

export function NotFound() {
  const { user } = useSession();
  const loc = useLocation();
  return (
    <section className="errpage" aria-labelledby="e-h">
      <p className="errcode mono" aria-hidden="true">404</p>
      <h1 id="e-h">Page not found</h1>
      <p>There is no page at <span className="mono">{loc.pathname}</span>. Check the address, or start again from your home page.</p>
      <Link className="btn" to={user ? homePathFor(user.role) : "/"}>Go to your home page</Link>
    </section>
  );
}
