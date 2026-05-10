import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { LoginErrorRedirect } from "./login-error-redirect";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <Suspense fallback={null}>
        <LoginErrorRedirect />
      </Suspense>
      <Suspense fallback={<div className="w-full max-w-md text-center text-white">Caricamento...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
