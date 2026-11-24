/** 07 §5.1: bottle-cap stamp. Crimped edge, double ring, set slightly off-axis. Decorative: the heading carries the meaning. */
export function BottleCap({ size = 72 }: { size?: number }) {
  const teeth = 24, r1 = 47, r2 = 43;
  let d = "";
  for (let i = 0; i < teeth * 2; i++) {
    const a = (Math.PI * i) / teeth;
    const r = i % 2 === 0 ? r1 : r2;
    d += `${i === 0 ? "M" : "L"}${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  }
  return (
    <svg className="bottlecap" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d={d + "Z"} fill="var(--pine)" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="var(--ivory)" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="var(--ivory)" strokeWidth="1.2" />
      <path d="M37 51 L46 60 L64 41" fill="none" stroke="var(--ivory)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
