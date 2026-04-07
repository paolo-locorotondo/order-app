"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AuthErrorContent({ supportEmail }: { supportEmail: string }) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // Map NextAuth error codes to user-friendly messages
  const errorMessages: Record<string, { title: string; description: string; action: string }> = {
    OAuthSignin: {
      title: "Errore nella Configurazione OAuth",
      description:
        "Non è stato possibile configurare correttamente l'accesso tramite Google. Questo potrebbe essere dovuto a credenziali mancanti o non valide nel server.",
      action: "Contatta l'amministratore per verificare la configurazione.",
    },
    OAuthCallback: {
      title: "Errore nel Callback OAuth",
      description:
        "Si è verificato un errore durante il completamento dell'autenticazione con Google. Prova di nuovo.",
      action: "Se il problema persiste, usa un altro metodo di accesso.",
    },
    OAuthCreateAccount: {
      title: "Impossibile Creare Account",
      description:
        "Non è stato possibile creare un account con i dati forniti da Google. Potrebbe esserci un problema temporaneo.",
      action: "Riprova più tardi o contatta il supporto.",
    },
    OAuthAccountNotLinked: {
      title: "Account Non Collegato",
      description:
        "Un account con questo email esiste già ma non è collegato a Google. Accedi con email e password per collegarlo.",
      action: "Accedi con le tue credenziali email.",
    },
    AccessDenied: {
      title: "Accesso Negato",
      description:
        "Hai negato l'accesso a Google o la sessione è scaduta. Riprova se lo desideri.",
      action: "Autorizza Google per accedere alla tua app.",
    },
    Callback: {
      title: "Errore di Autenticazione",
      description:
        "Si è verificato un errore durante il processo di autenticazione. Questo potrebbe essere un problema temporaneo del server.",
      action: "Riprova più tardi.",
    },
    Default: {
      title: "Errore di Accesso",
      description:
        "Si è verificato un errore sconosciuto durante l'autenticazione. Prova con un metodo diverso o riprova più tardi.",
      action: "Contatta il supporto se il problema persiste.",
    },
  };

  const errorInfo = errorMessages[error || "Default"] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-8 shadow-xl">
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-900/30 border border-red-700 p-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Error Content */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{errorInfo.title}</h1>
          <p className="text-slate-300 text-sm">{errorInfo.description}</p>
        </div>

        {/* Error Code */}
        {error && (
          <div className="mb-6 rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-3">
            <p className="text-xs text-slate-400">
              <span className="font-semibold">Codice errore:</span> {error}
            </p>
          </div>
        )}

        {/* Suggested Action */}
        <div className="mb-6 rounded-lg bg-blue-900/30 border border-blue-700 px-4 py-3">
          <p className="text-sm text-blue-200">{errorInfo.action}</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="block w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white text-center hover:bg-blue-700 transition-colors"
          >
            Torna al Login
          </Link>

          {/* Alternative Login Methods */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-slate-400">Oppure</span>
            </div>
          </div>

          <Link
            href="/auth/register"
            className="block w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-medium text-white text-center hover:bg-slate-700 transition-colors"
          >
            Registrati
          </Link>

          <p className="text-xs text-slate-400 text-center mt-4">
            Se il problema persiste, contatta{" "}
            <a href={`mailto:${supportEmail}`} className="text-blue-400 hover:text-blue-300">
              il supporto tecnico
            </a>
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-8 rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-3">
          <p className="text-xs text-slate-400 mb-2 font-semibold">Metodi di accesso disponibili:</p>
          <ul className="text-xs text-slate-400 space-y-1">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Email e Password
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-400">⚠</span> Google (se configurato)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AuthErrorContent;
