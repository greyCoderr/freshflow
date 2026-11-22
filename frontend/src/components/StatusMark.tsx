type Tone = "attention" | "active" | "done" | "ended" | "quiet";
const MAP: Record<string, { glyph: string; label: string; tone: Tone }> = {
  NEW: { glyph: "●", label: "New", tone: "attention" }, CONFIRMED: { glyph: "◐", label: "Confirmed", tone: "active" },
  PREPARING: { glyph: "◔", label: "Preparing", tone: "active" }, READY_FOR_PICKUP: { glyph: "▶", label: "Ready for Pickup", tone: "active" },
  OUT_FOR_DELIVERY: { glyph: "▶", label: "Out for Delivery", tone: "active" }, COMPLETED: { glyph: "✓", label: "Completed", tone: "done" },
  REJECTED: { glyph: "✕", label: "Rejected", tone: "ended" }, CANCELLED: { glyph: "✕", label: "Cancelled", tone: "ended" },
  OPEN: { glyph: "●", label: "Open", tone: "attention" }, IN_REVIEW: { glyph: "◐", label: "In Review", tone: "quiet" },
  RESPONDED: { glyph: "↩", label: "Responded", tone: "active" }, RESOLVED: { glyph: "✓", label: "Resolved", tone: "done" },
  LOW: { glyph: "▼", label: "Low stock", tone: "attention" }, OUT: { glyph: "✕", label: "Out of stock", tone: "ended" },
};
export function StatusMark({ status }: { status: string }) {
  const m = MAP[status] ?? { glyph: "•", label: status, tone: "quiet" as Tone };
  return <span className={`mark mark-${m.tone}`}><span aria-hidden="true">{m.glyph}</span> {m.label}</span>;
}
