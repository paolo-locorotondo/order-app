"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Accedi con Google</h1>
        <p className="mt-2 text-sm text-slate-600">Usa il tuo account Google per accedere all’app.</p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Accedi con Google
        </button>
      </div>
    </div>
  );
}
