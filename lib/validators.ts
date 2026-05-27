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

// Numero di telefono in formato internazionale (richiesto da WhatsApp wa.me).
// Accetta input libero (spazi, +, dashes) e normalizza a sole cifre. Empty
// string e null entrambi → null (pulisce il campo). Range 7-15 cifre dopo lo
// strip è il limite E.164; consigliamo lato UI di includere il country code
// (un numero italiano "nudo" tipo `333...` passa il check ma non funzionerà
// su WhatsApp — l'errore emerge al primo invio, accettabile per MVP).
export const phoneSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return null;
    const digits = String(v).replace(/\D+/g, "");
    return digits === "" ? null : digits;
  })
  .refine((v) => v == null || (v.length >= 7 && v.length <= 15), {
    message: "Numero non valido: 7-15 cifre incluso il prefisso internazionale.",
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
  // Solo l'admin-create lo userà; la self-registration non lo invia
  // (resta `undefined` → trasformato a `null` da phoneSchema).
  phoneNumber: phoneSchema,
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
  phoneNumber: phoneSchema,
});

// Body per il bulk role-change da POST /api/admin/users/bulk.
// `ids`: lista di user id (cuid) non vuota e con duplicati ignorati lato handler.
// `role`: ruolo target. Niente NUOVO se l'admin è in `ids` (controllo nel handler,
// non qui — è una regola di business che dipende dalla session).
export const bulkUserRoleSchema = z.object({
  ids: z.array(z.string().cuid()).min(1, "Seleziona almeno un utente"),
  role: z.enum([UserRole.NUOVO, UserRole.CUSTOMER, UserRole.ADMIN]),
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
