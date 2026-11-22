/** Money is integer centavos everywhere in app code. Never use floats for peso math. */
export const CURRENCY = "PHP" as const;
export function toCentavos(pesos: string | number): number {
  const s = typeof pesos === "number" ? pesos.toFixed(2) : pesos.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error("Invalid peso amount");
  const [w = "0", f = ""] = s.split(".");
  return Number(w) * 100 + Number(f.padEnd(2, "0"));
}
export function formatPeso(centavos: number): string {
  const sign = centavos < 0 ? "-" : "";
  const abs = Math.abs(centavos);
  const w = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}₱${w}.${String(abs % 100).padStart(2, "0")}`;
}
export const lineTotal = (unitCentavos: number, qty: number) => unitCentavos * qty;
