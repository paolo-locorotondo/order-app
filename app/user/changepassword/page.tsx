import { validateAuthFromServerSession, UserRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import AccessDenied from "@/components/AccessDenied";
import Link from "next/link";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const auth = await validateAuthFromServerSession([UserRole.NUOVO, UserRole.CUSTOMER, UserRole.ADMIN]);
  if (!auth.ok) {
    return <AccessDenied errorMessage={auth.errorResponse} />;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: auth.session.user.id },
    select: { password: true },
  });

  const isOAuthUser = !dbUser?.password;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-8 shadow-xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Cambio password</h1>
          <p className="mt-2 text-sm text-slate-400">
            Aggiorna la password del tuo account.
          </p>
        </div>

        {isOAuthUser ? (
          <>
            <div className="mb-4 rounded-lg bg-blue-900/30 border border-blue-700 px-4 py-3 text-sm text-blue-200">
              Il tuo account usa il login con Google. La password non è gestita da questa
              applicazione: per cambiarla, accedi al tuo account Google.
            </div>
            <Link
              href="https://myaccount.google.com/security"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-center font-medium text-white hover:bg-slate-700 transition-colors"
            >
              → Vai all&apos;account Google
            </Link>
          </>
        ) : (
          <ChangePasswordForm />
        )}

        <p className="mt-6 text-sm text-slate-400">
          <Link href="/dashboard" className="font-semibold text-white hover:text-blue-200">
            ← Torna alla dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
