import { UserRole } from "@/app/generated/prisma/enums";
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
  role: z.enum([UserRole.CUSTOMER, UserRole.ADMIN]).optional(),
});

// Input sanitization utilities
export const sanitizeString = (input: string, maxLength: number = 255): string => {
  return input
    .trim()
    .replace(/[<>]/g, "") // Basic XSS prevention
    .substring(0, maxLength);
};
