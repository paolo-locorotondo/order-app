"use client";

import { buildWhatsAppUrl } from "@/lib/whatsapp";

interface WhatsAppButtonProps {
    phoneNumber: string | null | undefined;
    message?: string;
    /** "sm" = compatto (icona + label corta), "icon" = solo icona quadrata. Default "sm". */
    size?: "sm" | "icon";
    /** Stop propagation: utile quando il bottone vive dentro una row cliccabile. Default true. */
    stopPropagation?: boolean;
    /** Tooltip override; default "Apri chat WhatsApp". */
    title?: string;
}

/**
 * Bottone link a `wa.me`. Se il numero è null/non valido **non renderizza**
 * (scelta di pulizia: vedi TODO Step 9). Il messaggio precompilato è opzionale
 * — il caller decide il contenuto chiamando i template di `lib/whatsapp.ts`.
 */
export default function WhatsAppButton({
    phoneNumber,
    message,
    size = "sm",
    stopPropagation = true,
    title = "Apri chat WhatsApp",
}: WhatsAppButtonProps) {
    const href = buildWhatsAppUrl(phoneNumber, message);
    if (!href) return null;

    const baseClass =
        "inline-flex items-center justify-center gap-1.5 rounded bg-[#25D366] text-white hover:bg-[#1ebe5a] focus:outline-none focus:ring-2 focus:ring-[#25D366]/50";
    const sizeClass = size === "icon" ? "h-7 w-7 p-1" : "px-2.5 py-1 text-xs font-medium";

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
                if (stopPropagation) e.stopPropagation();
            }}
            className={`${baseClass} ${sizeClass}`}
            title={title}
            aria-label={title}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={size === "icon" ? "h-4 w-4" : "h-3.5 w-3.5"}
                aria-hidden
            >
                <path d="M19.05 4.91A9.82 9.82 0 0012 2C6.48 2 2 6.48 2 12c0 1.78.46 3.51 1.34 5.04L2 22l5.13-1.34A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10 0-2.67-1.04-5.18-2.95-7.09zM12 20.13a8.13 8.13 0 01-4.14-1.13l-.3-.18-3.05.8.81-2.97-.2-.31A8.13 8.13 0 1120.13 12c0 4.49-3.65 8.13-8.13 8.13zm4.46-6.09c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12s-.62.78-.76.94c-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.59 4.1 3.63.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
            </svg>
            {size === "sm" && <span>WhatsApp</span>}
        </a>
    );
}
