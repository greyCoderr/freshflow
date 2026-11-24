/**
 * 07 §5.3: tally stepper. `[ - ] 3 [ + ]` with tick marks for the stock that can be chosen (up to 10, then a number).
 * `+` is disabled at the limit and the limit is said in text, not only shown.
 */
export function TallyStepper({ value, max, onChange, label, disabled, limitText }: {
  value: number; max: number; onChange: (n: number) => void; label: string; disabled?: boolean;
  /** Text shown when value reaches max. Default "Only {max} left." */
  limitText?: string;
}) {
  const ticks = Math.min(Math.max(max, 0), 10);
  return (
    <div className="tally-wrap">
      <div className="tally" role="group" aria-label={`Quantity, ${label}`}>
        <button type="button" aria-label={`Decrease ${label}`} disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}>−</button>
        <output className="mono" aria-live="polite">{value}</output>
        <button type="button" aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
      {max > 0 && (
        <div className="tally-ticks" aria-hidden="true">
          {Array.from({ length: ticks }, (_, i) => <span key={i} className={i < value ? "on" : ""} />)}
          {max > 10 && <span className="tally-more mono">{max}</span>}
        </div>
      )}
      {value >= max && max > 0 && <div role="status" className="tally-limit">{limitText ?? `Only ${max} left.`}</div>}
    </div>
  );
}
