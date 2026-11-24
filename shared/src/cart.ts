/** Cart and checkout rules shared by the API and the UI, so both say the same thing. */
export const MAX_CART_LINES = 20;

/** Plain-language stock limit message (07 voice: say what to do next). */
export function stockLimitMessage(available: number, inCart = 0): string {
  if (available <= 0) return "Out of stock right now.";
  if (inCart > 0) return `Only ${available} left, and ${inCart} ${inCart === 1 ? "is" : "are"} already in your cart.`;
  return `Only ${available} left. Lower the quantity to continue.`;
}

/** Why a cart line cannot be checked out as it is. null = fine. */
export type CartLineProblem = "unavailable" | "out_of_stock" | "over_available";
export function cartLineProblem(isActive: boolean, available: number, quantity: number): CartLineProblem | null {
  if (!isActive) return "unavailable";
  if (available <= 0) return "out_of_stock";
  if (quantity > available) return "over_available";
  return null;
}
export const CART_PROBLEM_TEXT: Record<CartLineProblem, (available: number) => string> = {
  unavailable: () => "No longer sold. Remove it to continue.",
  out_of_stock: () => "Out of stock right now. Remove it to continue.",
  over_available: (a) => `Only ${a} left. Lower the quantity to continue.`,
};
