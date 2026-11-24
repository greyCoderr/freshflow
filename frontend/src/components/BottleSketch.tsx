/** Small monoline milk bottle for empty states (07 §8). Drawn for the project; decorative. */
export function BottleSketch() {
  return (
    <svg className="sketch" width="56" height="72" viewBox="0 0 56 72" aria-hidden="true" focusable="false"
      fill="none" stroke="var(--sage-d)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="20" y="3" width="16" height="6" rx="1.5" />
      <path d="M21 9v7c0 3-9 7-9 15v33a5 5 0 0 0 5 5h22a5 5 0 0 0 5-5V31c0-8-9-12-9-15V9" />
      <path d="M12 40h32M12 56h32" />
    </svg>
  );
}
