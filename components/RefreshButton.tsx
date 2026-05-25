"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface RefreshButtonProps {
    label?: string;
    className?: string;
}

export default function RefreshButton({ label = "Aggiorna", className }: RefreshButtonProps) {
    const router = useRouter();
    const [spinning, setSpinning] = useState(false);

    const onClick = () => {
        setSpinning(true);
        router.refresh();
        // Feedback visivo: animazione breve. router.refresh() è fire-and-forget
        // dal punto di vista del caller, l'effettivo re-render arriva con i nuovi dati.
        setTimeout(() => setSpinning(false), 600);
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={spinning}
            className={
                className ??
                "inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-60"
            }
            aria-label="Aggiorna dati"
            title="Aggiorna dati"
        >
            <span className={`inline-block ${spinning ? "animate-spin" : ""}`} aria-hidden>
                ⟳
            </span>
            <span>{label}</span>
        </button>
    );
}
