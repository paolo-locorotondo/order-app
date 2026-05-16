"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"credentials" | "google">("credentials");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setError("Failed to sign in with Google");
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-8 shadow-xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Benvenuto</h1>
        <p className="mt-2 text-sm text-slate-400">Accedi al tuo account per continuare</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 bg-slate-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("credentials")}
          className={`flex-1 py-2 px-3 rounded font-medium text-sm transition-colors ${
            activeTab === "credentials"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Email e Password
        </button>
        <button
          onClick={() => setActiveTab("google")}
          className={`flex-1 py-2 px-3 rounded font-medium text-sm transition-colors ${
            activeTab === "google"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Google
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Credentials Tab */}
      {activeTab === "credentials" && (
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Accesso in corso..." : "Accedi"}
          </button>

          <p className="mt-4 text-sm text-slate-400">
            Non hai un account?{' '}
            <a href="/auth/register" className="font-semibold text-white hover:text-blue-200">
              Registrati qui
            </a>
          </p>

        </form>
      )}

      {/* Google Tab */}
      {activeTab === "google" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Accedi rapidamente usando il tuo account Google. Verranno usate le seguenti info: Nome, Email, Immagine
          </p>
          <button
            onClick={handleGoogleSignIn}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Accedi con Google
          </button>
        </div>
      )}
    </div>
  );
}
