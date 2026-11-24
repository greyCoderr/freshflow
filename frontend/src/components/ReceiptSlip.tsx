import type { ReactNode } from "react";
import { formatPeso } from "@freshflow/shared";

export interface SlipLine { key: string | number; label: string; detail?: string; amountCentavos: number }

/**
 * 07 §5.4: the one receipt component (cart summary, order confirmation, POS review, printable summary).
 * Perforated edge is decorative; name and amount stay in one row of a description list.
 */
export function ReceiptSlip({ title, meta, lines, totalCentavos, totalLabel = "Total", children, className }: {
  title: string; meta?: ReactNode; lines: SlipLine[]; totalCentavos: number; totalLabel?: string; children?: ReactNode; className?: string;
}) {
  return (
    <section className={`slip receipt${className ? " " + className : ""}`} aria-label={title}>
      <h2 className="receipt-title">{title}</h2>
      {meta && <div className="receipt-meta mono">{meta}</div>}
      <dl className="receipt-lines">
        {lines.map((l) => (
          <div key={l.key} className="leader receipt-line">
            <dt>{l.label}{l.detail && <span className="receipt-detail mono">{l.detail}</span>}</dt>
            <dd className="mono">{formatPeso(l.amountCentavos)}</dd>
          </div>
        ))}
      </dl>
      <div className="receipt-total leader">
        <span>{totalLabel}</span>
        <span className="receipt-amount">{formatPeso(totalCentavos)}</span>
      </div>
      {children && <div className="receipt-foot">{children}</div>}
    </section>
  );
}
