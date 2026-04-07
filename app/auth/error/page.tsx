import { Suspense } from "react";
import AuthErrorContent from "./auth-error-content";

function ErrorSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-8 shadow-xl animate-pulse">
        <div className="h-24 bg-slate-800 rounded mb-4" />
        <div className="h-8 bg-slate-800 rounded mb-2" />
        <div className="h-16 bg-slate-800 rounded" />
      </div>
    </div>
  );
}

export default function ErrorPage() {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@example.com";

  return (
    <Suspense fallback={<ErrorSkeleton />}>
      <AuthErrorContent supportEmail={supportEmail} />
    </Suspense>
  );
}
