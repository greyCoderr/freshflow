import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, ShoppingCart, User, X } from "lucide-react";
import { isStaffRole } from "@freshflow/shared";
import { useSession } from "../lib/session";

const links = [["/", "Home"], ["/products", "Products"], ["/orders", "My Orders"], ["/concerns", "Feedback & Concerns"]] as const;
const ICON = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

export function CustomerLayout() {
  const { user } = useSession();
  const loc = useLocation();
  const [sheet, setSheet] = useState(false);
  useEffect(() => { setSheet(false); }, [loc.pathname]);
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet]);

  const navLinks = links.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>);
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <header className="top"><div className="wrap">
        <Link className="brand" to="/">FreshFlow</Link>
        <nav aria-label="Main" className="top-nav">{navLinks}</nav>
        <div className="top-end">
          {user && isStaffRole(user.role) && <Link to="/staff" className="top-link">Staff workspace</Link>}
          <NavLink to="/cart" className="top-link"><ShoppingCart {...ICON} /><span>Cart</span></NavLink>
          {user
            ? <NavLink to="/account" className="top-link"><User {...ICON} /><span>Account</span></NavLink>
            : <Link to="/login" className="top-link"><User {...ICON} /><span>Sign in</span></Link>}
          <button type="button" className="btn ghost sheet-btn" aria-expanded={sheet} aria-controls="sheet" onClick={() => setSheet((v) => !v)}>
            {sheet ? <X {...ICON} /> : <Menu {...ICON} />} Menu
          </button>
        </div>
      </div></header>
      {sheet && (
        <>
          <div className="scrim show" aria-hidden="true" onClick={() => setSheet(false)} />
          <nav id="sheet" className="sheet" aria-label="Main">
            {navLinks}
            {!user && <Link to="/register">Create an account</Link>}
          </nav>
        </>
      )}
      <main id="main" className="wrap page"><Outlet /></main>
    </>
  );
}
