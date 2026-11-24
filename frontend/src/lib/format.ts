/** People-facing date and time per 07: "Nov 22, 2026 · 8:41 PM", in Philippine time. ISO stays in the title attribute. */
const D = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
const T = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${D.format(d)} · ${T.format(d)}`;
}
