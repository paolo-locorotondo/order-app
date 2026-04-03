import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  sku: z.string().optional(),
  image: z.string().optional(),
});

export const cartItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1),
});

export const orderCreateSchema = z.object({
  cartItemIds: z.string().array().min(1),
  address: z.string().min(5),
  paymentMethod: z.enum(["stripe", "paypal", "cash"]).optional().default("cash"),
});
