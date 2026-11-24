import { randomInt } from "node:crypto";

// No 0/O, 1/I/L: order numbers get read aloud over the phone and copied by hand.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Philippine date (UTC+8, no DST) as YYMMDD. */
export function manilaYYMMDD(d = new Date()): string {
  const m = new Date(d.getTime() + 8 * 3_600_000);
  return `${String(m.getUTCFullYear()).slice(2)}${String(m.getUTCMonth() + 1).padStart(2, "0")}${String(m.getUTCDate()).padStart(2, "0")}`;
}

/** e.g. FF-261123-K7Q4M. 31^5 (about 28.6 million) codes per day; a collision hits the unique index and is retried. */
export function newOrderNo(d = new Date()): string {
  let code = "";
  for (let i = 0; i < 5; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `FF-${manilaYYMMDD(d)}-${code}`;
}
