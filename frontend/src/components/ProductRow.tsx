import { useState } from "react";
import { formatPeso } from "@freshflow/shared";
import { TallyStepper } from "./TallyStepper";
import { StatusMark } from "./StatusMark";
export interface ProductDto { id: number; name: string; unit: string; description: string | null; priceCentavos: number; available: number; imageUrl: string | null }
export function ProductRow({ p, onAdd }: { p: ProductDto; onAdd: (id: number, qty: number) => void }) {
  const [qty, setQty] = useState(1);
  const out = p.available <= 0;
  return (
    <li className="prow">
      <div className="prow-photo">{p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span>Photo pending</span>}</div>
      <div className="prow-body">
        <h3 className="leader"><span>{p.name}</span><span className="mono" style={{ fontSize: "1.125rem" }}>{formatPeso(p.priceCentavos)}</span></h3>
        <p style={{ margin: 0, color: "var(--ink-2)" }}>{p.unit} · {p.description}</p>
        <div className="prow-act">
          {out ? <StatusMark status="OUT" /> : <TallyStepper label={p.name} value={qty} max={p.available} onChange={setQty} />}
          <button className="btn" disabled={out} onClick={() => onAdd(p.id, qty)}>Add to cart</button>
        </div>
      </div>
    </li>
  );
}
