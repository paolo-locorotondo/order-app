"use client";

import { useState, ReactNode } from "react";

interface FiltersAccordionProps {
    /** Sommario mostrato accanto al titolo (es. "X di Y ordini"). */
    summary?: ReactNode;
    /** Callback per resettare tutti i filtri ai valori di default. */
    onReset?: () => void;
    /** Se true, il pulsante Reset è cliccabile (= almeno un filtro è attivo). */
    canReset?: boolean;
    children: ReactNode;
    defaultOpen?: boolean;
    title?: string;
}

export default function FiltersAccordion({
    summary,
    onReset,
    canReset = false,
    children,
    defaultOpen = true,
    title = "Filtri",
}: FiltersAccordionProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="-mx-2 flex flex-1 items-center justify-between gap-2 rounded px-2 py-1 text-left hover:bg-slate-50"
                    aria-expanded={open}
                >
                    <h3 className="text-sm font-semibold text-slate-700">
                        {title}
                        {summary && <span className="ml-2 text-xs font-normal text-slate-500">{summary}</span>}
                    </h3>
                    <span className="text-slate-400" aria-hidden>{open ? "▾" : "▸"}</span>
                </button>
                {onReset && (
                    <button
                        type="button"
                        onClick={onReset}
                        disabled={!canReset}
                        className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100"
                        title={canReset ? "Reset filtri" : "Nessun filtro attivo"}
                    >
                        Reset filtri
                    </button>
                )}
            </div>
            {open && <div className="border-t border-slate-100 p-4">{children}</div>}
        </div>
    );
}
