import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatPeso } from "@freshflow/shared";
import { TallyStepper } from "./TallyStepper";
import { StatusMark } from "./StatusMark";

export interface ProductDto { id: number; name: string; unit: string; description: string | null; priceCentavos: number; available: number; imageUrl: string | null }

/** How the row may act for the current visitor. */
export type AddMode = "guest" | "customer" | "cannot_order";

/** 07 §5.2: hang-tag row. Photo on sage, name in display type, unit and price on a dotted leader, availability, tally. */
export function ProductRow({ p, inCart, mode, busy, message, onAdd }: {
  p: ProductDto; inCart: number; mode: AddMode; busy: boolean;
  message?: { tone: "ok" | "attention"; text: string } | null;
  onAdd: (id: number, qty: number) => void;
}) {
  const room = Math.max(0, p.available - inCart); // the server checks again; this only shapes the control
  const [qty, setQty] = useState(1);
  useEffect(() => { setQty(1); }, [inCart]); // after an add, start again from 1
  useEffect(() => { if (qty > Math.max(room, 1)) setQty(Math.max(room, 1)); }, [room, qty]);
  const out = p.available <= 0;
  const full = !out && room === 0;
  const headId = `p-${p.id}`;
  return (
    <li className="prow" aria-labelledby={headId}>
      <div className="prow-photo">
        {p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span><span className="prow-ph-name">{p.name}</span>Photo pending</span>}
      </div>
      <div className="prow-body">
        <h3 id={headId} className="prow-name">{p.name}</h3>
        <dl className="prow-price">
          <div className="leader"><dt>{p.unit}</dt><dd className="mono">{formatPeso(p.priceCentavos)}</dd></div>
        </dl>
        {p.description && <p className="prow-desc">{p.description}</p>}
        <p className="prow-stock">
          {out ? <StatusMark status="OUT" /> : <span className="mono">{p.available} available</span>}
          {inCart > 0 && <><span aria-hidden="true">·</span><Link to="/cart">{inCart} in your cart</Link></>}
        </p>
        {mode === "guest" && !out && <p className="prow-act"><Link className="btn ghost" to="/login?next=/products">Sign in to order</Link></p>}
        {mode === "customer" && !out && (
          <div className="prow-act">
            {full
              ? <p className="tally-limit" role="status">All {p.available} available are in your cart.</p>
              : <TallyStepper label={p.name} value={qty} max={room} onChange={setQty} disabled={busy}
                  limitText={inCart > 0 ? `Only ${p.available} left, and ${inCart} ${inCart === 1 ? "is" : "are"} in your cart.` : undefined} />}
            <button className="btn" disabled={busy || full} onClick={() => onAdd(p.id, qty)}>{busy ? "Adding…" : "Add to cart"}</button>
          </div>
        )}
        {message && <p role="status" className={`prow-msg ${message.tone}`}>{message.text}{message.tone === "ok" && <> <Link to="/cart">View cart</Link></>}</p>}
      </div>
    </li>
  );
}
