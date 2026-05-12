import { getToken } from "next-auth/jwt";
import { prisma } from "./db";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/generated/prisma/enums";

// Re-export per comodità — chi importa validateAuth può usare UserRole direttamente
export { UserRole };

/**
 * Validate that user exists in database and has required role.
 * @param request HTTP request
 * @param requiredRoles Optional: uno o più ruoli consentiti.
 *   - validateAuth(req, "ADMIN") → solo admin
 *   - validateAuth(req, ["ADMIN", "CUSTOMER"]) → admin o customer
 *   - validateAuth(req) → qualsiasi utente autenticato
 */
export async function validateAuth(
  request: NextRequest,
  requiredRoles?: UserRole | UserRole[]
) {
  // 0. Get token from request
  if (!process.env.NEXTAUTH_SECRET) {
    return { ok: false, errorResponse: serverErrorResponse("Server configuration error.") };
  }
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // 1. Check if token exists
  if (!token || !token.id) {
    return { ok: false, errorResponse: unauthorizedResponse("Unauthorized") };
  }

  // 2. Check if user exists in database
  const dbUser = await prisma.user.findUnique({
    where: { id: token.id as string },
  });
  if (!dbUser) {
    return { ok: false, errorResponse: unauthorizedResponse("Unauthorized") };
  }

  // 3. Check role if required
  if (requiredRoles) {
    // Normalizza sempre ad array: "ADMIN" → ["ADMIN"]
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    if (!allowedRoles.includes(dbUser.role as UserRole)) {
      return { ok: false, errorResponse: forbiddenResponse("Forbidden: insufficient permissions") };
    }
  }

  // 4. Tutto ok, ritorna user e token
  return { ok: true, token, user: dbUser };
}

/**
 * Helper to create unauthorized response (401 - non autenticato)
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Helper to create forbidden response (403 - autenticato ma senza permessi)
 */
export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Helper to create Error response (500 - errore nel server)
 */
export function serverErrorResponse(message = "Internal Server Error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Validate that user exists in database and has required role.
 * @param requiredRoles Optional: uno o più ruoli consentiti.
 *   - validateAuthFromServerSession("ADMIN") → solo admin
 *   - validateAuthFromServerSession(["ADMIN", "CUSTOMER"]) → admin o customer
 *   - validateAuthFromServerSession() → qualsiasi utente autenticato
 */
export async function validateAuthFromServerSession(
  requiredRoles?: UserRole | UserRole[]
) {

  // 0. Get session from server
  const session = await getServerSession(authOptions);

  // 1. Check if user exists
  if (!session || !session.user || !session.user.id) {
    return { ok: false, errorResponse: "Unauthorized" };
  }

  // 2. Check if user exists in database
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id as string },
  });
  if (!dbUser) {
    return { ok: false, errorResponse: "Unauthorized" };
  }

  // 3. Check role if required
  if (requiredRoles) {
    // Normalizza sempre ad array: "ADMIN" → ["ADMIN"]
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    if (!allowedRoles.includes(session?.user?.role as UserRole)) {
      return { ok: false, errorResponse: "Forbidden: insufficient permissions" };
    }
  }

  // 4. Tutto ok, ritorna session (contiene anche user)
  return { ok: true, session: session };
}