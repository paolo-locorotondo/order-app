import { getToken } from "next-auth/jwt";
import { prisma } from "./db";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/app/generated/prisma/enums";
import { UserModel } from "@/app/generated/prisma/models";

// Re-export per comodità — chi importa validateAuth può usare UserRole direttamente
export { UserRole };

// ─── Discriminated union per validateAuth (API routes) ────────────────────────

type AuthSuccess = {
  ok: true;
  token: Awaited<ReturnType<typeof getToken>> & { id: string };
  user: UserModel;
};

type AuthFailure = {
  ok: false;
  errorResponse: ReturnType<typeof NextResponse.json>;
};

type AuthResult = AuthSuccess | AuthFailure;

// ─── Discriminated union per validateAuthFromServerSession (Server Components) ─

type ServerAuthSuccess = {
  ok: true;
  session: Session & {
    user: {
      id: string;           // garantito non-nullable
      name?: string | null;
      email?: string | null;
      role: UserRole;
    };
  };
};

type ServerAuthFailure = {
  ok: false;
  errorResponse: string;
};

type ServerAuthResult = ServerAuthSuccess | ServerAuthFailure;

// ─── validateAuth — per API routes ───────────────────────────────────────────

/**
 * Validate that user exists in database and has required role.
 * @param request HTTP request
 * @param requiredRoles Optional: uno o più ruoli consentiti.
 *   - validateAuth(req, "ADMIN")                 → solo admin
 *   - validateAuth(req, ["ADMIN", "CUSTOMER"])   → admin o customer
 *   - validateAuth(req)                          → qualsiasi utente autenticato
 */
export async function validateAuth(
  request: NextRequest,
  requiredRoles?: UserRole | UserRole[]
): Promise<AuthResult> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.id) {
    return { ok: false, errorResponse: unauthorizedResponse("Unauthorized") };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: token.id as string },
  });

  if (!dbUser) {
    return { ok: false, errorResponse: unauthorizedResponse("Unauthorized") };
  }

  if (requiredRoles) {
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    if (!allowedRoles.includes(dbUser.role as UserRole)) {
      return { ok: false, errorResponse: forbiddenResponse("Forbidden: insufficient permissions") };
    }
  }

  return {
    ok: true,
    token: token as AuthSuccess["token"],
    user: dbUser,
  };
}

// ─── validateAuthFromServerSession — per Server Components ───────────────────

/**
 * Validate that user exists in database and has required role.
 * @param requiredRoles Optional: uno o più ruoli consentiti.
 *   - validateAuthFromServerSession("ADMIN")                → solo admin
 *   - validateAuthFromServerSession(["ADMIN", "CUSTOMER"])  → admin o customer
 *   - validateAuthFromServerSession()                       → qualsiasi utente autenticato
 */
export async function validateAuthFromServerSession(
  requiredRoles?: UserRole | UserRole[]
): Promise<ServerAuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { ok: false, errorResponse: "Unauthorized" };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser) {
    return { ok: false, errorResponse: "Unauthorized" };
  }

  if (requiredRoles) {
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    if (!allowedRoles.includes(dbUser.role as UserRole)) {
      return { ok: false, errorResponse: "Forbidden: insufficient permissions" };
    }
  }

  return {
    ok: true,
    session: {
      ...session,
      user: {
        ...session.user,
        id: session.user.id,       // TypeScript ora sa che è string, non string | undefined
        role: dbUser.role as UserRole,
      },
    },
  };
}

// ─── Response helpers ─────────────────────────────────────────────────────────

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}