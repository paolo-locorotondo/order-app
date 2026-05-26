import { PaymentMethods, UserRole } from "@/app/generated/prisma/enums";
import { z } from "zod";

// Single source of truth per i prezzi (Product, OrderItem, ecc.).
// DB è Float (no constraint), quindi imponiamo qui: ≥ 0 e max 2 decimali.
// Il refine confronta `n*100` con il suo arrotondato a meno di 1e-6
// per tollerare i drift IEEE 754 (es. 19.99*100 = 1998.99999...).
export const priceSchema = z
  .number()
  .nonnegative("Prezzo non può essere negativo")
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, {
    message: "Massimo 2 decimali",
  });

export const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: priceSchema,
  sku: z.string().optional(),
  image: z.string().optional(),
  // Data di consegna prevista. Il client invia stringhe ISO (es. "2026-05-28")
  // o l'empty string per "non specificata"; null e undefined entrambi → DB NULL.
  deliveryDate: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v == null || v === "") return null;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    }),
});

export const cartItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1),
});

export const orderCreateSchema = z.object({
  cartItemIds: z.string().array().min(1),
  address: z.string().min(5),
  notes: z.string().max(2000).optional(),
  paymentMethod: z.enum([PaymentMethods.STRIPE, PaymentMethods.PAYPAL, PaymentMethods.CASH]).optional().default(PaymentMethods.CASH),
});

// Security validation schemas
export const userRegistrationSchema = z.object({
  name: z.string()
    .min(2, "Nome troppo corto")
    .max(100, "Nome troppo lungo")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Nome contiene caratteri non validi"),
  email: z.string()
    .email("Email non valida")
    .max(254, "Email troppo lunga")
    .transform(email => email.toLowerCase().trim()),
  password: z.string()
    .min(8, "Password deve essere di almeno 8 caratteri")
    .max(128, "Password troppo lunga")
    .regex(/[A-Z]/, "Password deve contenere almeno una lettera maiuscola")
    .regex(/[a-z]/, "Password deve contenere almeno una lettera minuscola")
    .regex(/\d/, "Password deve contenere almeno un numero")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password deve contenere almeno un carattere speciale"),
});

export const userLoginSchema = z.object({
  email: z.string()
    .email("Email non valida")
    .transform(email => email.toLowerCase().trim()),
  password: z.string().min(1, "Password richiesta"),
});

export const userUpdateSchema = z.object({
  name: z.string()
    .min(2, "Nome troppo corto")
    .max(100, "Nome troppo lungo")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Nome contiene caratteri non validi")
    .optional(),
  email: z.string()
    .email("Email non valida")
    .max(254, "Email troppo lunga")
    .transform(email => email.toLowerCase().trim())
    .optional(),
  password: z.string()
    .min(8, "Password deve essere di almeno 8 caratteri")
    .max(128, "Password troppo lunga")
    .regex(/[A-Z]/, "Password deve contenere almeno una lettera maiuscola")
    .regex(/[a-z]/, "Password deve contenere almeno una lettera minuscola")
    .regex(/\d/, "Password deve contenere almeno un numero")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password deve contenere almeno un carattere speciale")
    .optional(),
  role: z.enum([UserRole.NUOVO, UserRole.CUSTOMER, UserRole.ADMIN]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password attuale richiesta"),
  newPassword: z.string()
    .min(8, "Password deve essere di almeno 8 caratteri")
    .max(128, "Password troppo lunga")
    .regex(/[A-Z]/, "Password deve contenere almeno una lettera maiuscola")
    .regex(/[a-z]/, "Password deve contenere almeno una lettera minuscola")
    .regex(/\d/, "Password deve contenere almeno un numero")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password deve contenere almeno un carattere speciale"),
});

// Input sanitization utilities
export const sanitizeString = (input: string, maxLength: number = 255): string => {
  return input
    .trim()
    .replace(/[<>]/g, "") // Basic XSS prevention
    .substring(0, maxLength);
};
