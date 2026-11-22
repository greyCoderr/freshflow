import { z } from "zod";

export const loginSchema = z.object({ identifier: z.string().trim().min(1).max(120), password: z.string().min(1).max(200) });
export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  contactNumber: z.string().trim().regex(/^(09|\+639)\d{9}$/, "Use a valid PH mobile number"),
  password: z.string().min(8).max(200),
});
export const quantitySchema = z.number().int().positive().max(1000);
export const cartLineSchema = z.object({ productId: z.number().int().positive(), quantity: quantitySchema });
export const checkoutSchema = z.object({
  operationKey: z.string().uuid(),
  contactName: z.string().trim().min(2).max(120),
  contactNumber: z.string().trim().min(7).max(20),
  fulfillment: z.enum(["PICKUP", "DELIVERY"]),
  address: z.string().trim().max(300).optional(),
  note: z.string().trim().max(300).optional(),
}).refine((v) => v.fulfillment !== "DELIVERY" || !!v.address, { path: ["address"], message: "Address is required for delivery" });
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
