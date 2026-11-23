import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { KeyRound, LogOut, Menu, X } from "lucide-react";
import { ROLE_LABELS } from "@freshflow/shared";
import { useSession } from "../lib/session";
import { sectionFor, STAFF_NAV } from "./staffNav";
import { SignOutButton } from "../components/SignOutButton";

const ICON = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

export function StaffLayout() {
  const s = useSession();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const rail = useRef<HTMLElement>(null);
  const main = useRef<HTMLDivElement>(null);
  const user = s.user!;
  const items = STAFF_NAV.filter((n) => n.permission === null || s.can(n.permission));
  const groups = [...new Set(items.map((i) => i.group))];
  const section = sectionFor(loc.pathname);

  // Drawer (under 1024px): close on navigation, Escape closes, focus goes in and comes back, content behind is inert.
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (main.current) main.current.inert = open;
    if (!open) return;
    rail.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); menuBtn.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`staff${open ? " drawer-open" : ""}`}>
      <a href="#staff-main" className="skip">Skip to content</a>
      <nav ref={rail} className="rail" aria-label="Workspace" id="staff-rail">
        <div className="rail-head">
          <Link to="/staff" className="rail-brand">FreshFlow</Link>
          <span className="rail-sub mono">BFDC workspace</span>
          <button type="button" className="rail-close" onClick={() => { setOpen(false); menuBtn.current?.focus(); }} aria-label="Close menu"><X {...ICON} /></button>
        </div>
        <div className="rail-links">
          {groups.map((g) => (
            <div key={g || "top"} className="rail-group">
              {g && <p className="rail-label">{g}</p>}
              <ul>
                {items.filter((i) => i.group === g).map(({ to, label, icon: Icon }) => (
                  <li key={to}><NavLink to={to} end={to === "/staff"}><Icon {...ICON} /><span>{label}</span></NavLink></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="rail-foot">
          <p className="rail-name">{user.fullName}</p>
          <p className="rail-role">{ROLE_LABELS[user.role]}</p>
          <Link to="/staff/account" className="rail-action"><KeyRound {...ICON} /><span>Account</span></Link>
          <SignOutButton className="rail-action"><LogOut {...ICON} /><span>Sign out</span></SignOutButton>
        </div>
      </nav>
      <div className="scrim" aria-hidden="true" onClick={() => setOpen(false)} />
      <div ref={main} className="staff-main">
        <div className="staff-bar">
          <button ref={menuBtn} type="button" className="btn ghost menu-btn" aria-expanded={open} aria-controls="staff-rail" onClick={() => setOpen(true)}>
            <Menu {...ICON} /> Menu
          </button>
          <span className="staff-section">{section?.label ?? (loc.pathname.startsWith("/staff/account") ? "Account" : "")}</span>
        </div>
        <main id="staff-main" className="staff-content" tabIndex={-1}><Outlet /></main>
      </div>
    </div>
  );
}
