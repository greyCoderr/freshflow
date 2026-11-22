export function TallyStepper({ value, max, onChange, label }: { value: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div>
      <div className="tally" role="group" aria-label={label}>
        <button type="button" aria-label={`Decrease ${label}`} disabled={value <= 1} onClick={() => onChange(value - 1)}>−</button>
        <output className="mono" aria-live="polite">{value}</output>
        <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
      {value >= max && <div role="status" style={{ color: "var(--clay-t)", fontSize: ".875rem" }}>Only {max} left.</div>}
    </div>
  );
}
