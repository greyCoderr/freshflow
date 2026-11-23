/** Placeholder for sections whose screens come in later patches. Access is already enforced. */
export function NotBuilt({ title }: { title: string }) {
  return (
    <section aria-labelledby="nb-h">
      <h1 id="nb-h">{title}</h1>
      <p className="quiet">This section is not ready yet. It will appear here in a later update.</p>
    </section>
  );
}
