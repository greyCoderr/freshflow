import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string; name: string; error?: string[] | string; hint?: ReactNode;
}
/** Label above, hint and error below, wired with aria-describedby so screen readers read them. */
export function Field({ label, name, error, hint, className, ...rest }: Props) {
  const id = useId();
  const msg = Array.isArray(error) ? error[0] : error;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = msg ? `${id}-err` : undefined;
  return (
    <div className={`field${className ? " " + className : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} aria-invalid={msg ? true : undefined} aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined} {...rest} />
      {hint && <span id={hintId} className="hint">{hint}</span>}
      {msg && <span id={errId} className="err">{msg}</span>}
    </div>
  );
}
