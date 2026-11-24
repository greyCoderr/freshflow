import { z } from "zod";

export const PH_MOBILE = /^(09|\+639)\d{9}$/;

export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(200);
export const loginSchema = z.object({ identifier: z.string().trim().min(1).max(120), password: z.string().min(1).max(200) });
export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  contactNumber: z.string().trim().regex(PH_MOBILE, "Use a valid PH mobile number"),
  password: passwordSchema,
});
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Choose a password different from the current one" });
/** Admin creates staff/admin accounts. The password is never sent: the server sets DEFAULT_PASSWORD and forces a change. */
export const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  username: z.string().trim().regex(/^[a-zA-Z0-9._-]{3,60}$/, "3 to 60 letters, numbers, dot, dash or underscore").optional(),
  role: z.enum(["SALES", "PLANT_STAFF", "MEMBERSHIP_HR", "ADMIN"]),
});
export const quantitySchema = z.number({ invalid_type_error: "Enter a whole number" }).int("Enter a whole number").positive("Enter at least 1").max(1000, "That is more than we can take in one order");
/** Add to cart: the quantity is added to what is already in the cart. */
export const cartLineSchema = z.object({ productId: z.number().int().positive(), quantity: quantitySchema });
/** Change a cart line: the quantity replaces what is in the cart. Remove a line with DELETE, not quantity 0. */
export const cartQuantitySchema = z.object({ quantity: quantitySchema });
/**
 * Checkout. Unknown keys (prices, totals, status, customerId...) are stripped: the server reads the cart
 * and current prices itself. `expectedTotalCentavos` is the total the customer saw; if the server's
 * total differs, the order is refused with `price_changed` so the customer reviews the new total.
 */
export const checkoutSchema = z.object({
  operationKey: z.string().uuid(),
  contactName: z.string().trim().min(2, "Enter the name for this order").max(120),
  contactNumber: z.string().trim().regex(PH_MOBILE, "Use a valid PH mobile number, e.g. 09171234567"),
  fulfillment: z.enum(["PICKUP", "DELIVERY"]),
  address: z.string().trim().max(300).optional(),
  note: z.string().trim().max(300).optional(),
  expectedTotalCentavos: z.number().int().nonnegative(),
}).refine((v) => v.fulfillment !== "DELIVERY" || !!v.address, { path: ["address"], message: "Address is required for delivery" });
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CartLineInput = z.infer<typeof cartLineSchema>;
