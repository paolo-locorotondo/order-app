"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface ComboboxOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    inputClassName?: string;
    noOptionsMessage?: string;
    /** id del trigger input (per associare un <label htmlFor>). */
    id?: string;
    /** required HTML5 — segnala vuoto se la selezione è ""/null. */
    required?: boolean;
}

const DEFAULT_INPUT_CLASS =
    "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 pr-9 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500/20";

/**
 * Combobox accessibile, no deps, con:
 * - filtro testuale realtime (case-insensitive sulla label)
 * - navigazione tastiera (frecce, Enter, Esc)
 * - click-outside per chiudere
 * - hidden input per supporto `required` nei form HTML5
 */
export default function Combobox({
    options,
    value,
    onChange,
    placeholder = "Seleziona...",
    disabled = false,
    className,
    inputClassName,
    noOptionsMessage = "Nessun risultato",
    id,
    required,
}: ComboboxProps) {
    const reactId = useId();
    const listboxId = `${id ?? reactId}-listbox`;
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlight, setHighlight] = useState(-1);

    const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

    // Sincronizza il display con la selezione esterna quando il dropdown è chiuso.
    // Mentre è aperto, lasciamo che `query` rifletta ciò che l'utente digita.
    useEffect(() => {
        if (!open) {
            setQuery(selected?.label ?? "");
        }
    }, [selected, open]);

    // Click fuori → chiudi e ripristina la label canonica.
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery(selected?.label ?? "");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open, selected]);

    const filtered = useMemo(() => {
        // Se il dropdown è appena aperto e la query coincide con la label
        // selezionata, mostra tutto: l'utente sta solo "guardando" la lista.
        const q = query.trim().toLowerCase();
        if (!q || (selected && q === selected.label.toLowerCase())) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query, selected]);

    // Scroll dell'highlighted in vista.
    useEffect(() => {
        if (!open || highlight < 0 || !listRef.current) return;
        const el = listRef.current.children[highlight] as HTMLElement | undefined;
        el?.scrollIntoView({ block: "nearest" });
    }, [highlight, open]);

    const openWithReset = () => {
        if (disabled) return;
        setOpen(true);
        setHighlight(filtered.findIndex((o) => o.value === value));
    };

    const commit = (opt: ComboboxOption) => {
        if (opt.disabled) return;
        onChange(opt.value);
        setOpen(false);
        setQuery(opt.label);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) {
                openWithReset();
                return;
            }
            setHighlight((h) => {
                let next = h;
                for (let step = 0; step < filtered.length; step++) {
                    next = (next + 1) % filtered.length;
                    if (!filtered[next]?.disabled) return next;
                }
                return h;
            });
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) {
                openWithReset();
                return;
            }
            setHighlight((h) => {
                let next = h <= 0 ? filtered.length - 1 : h - 1;
                for (let step = 0; step < filtered.length; step++) {
                    if (!filtered[next]?.disabled) return next;
                    next = next <= 0 ? filtered.length - 1 : next - 1;
                }
                return h;
            });
        } else if (e.key === "Enter") {
            if (!open) return;
            e.preventDefault();
            const opt = filtered[highlight];
            if (opt) commit(opt);
        } else if (e.key === "Escape") {
            if (!open) return;
            e.preventDefault();
            setOpen(false);
            setQuery(selected?.label ?? "");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setQuery(v);
        if (!open) setOpen(true);
        setHighlight(0);
    };

    const handleClear = () => {
        onChange("");
        setQuery("");
        setOpen(true);
        setHighlight(-1);
        inputRef.current?.focus();
    };

    return (
        <div ref={containerRef} className={`relative ${className ?? ""}`}>
            <input
                ref={inputRef}
                id={id}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-autocomplete="list"
                autoComplete="off"
                value={query}
                placeholder={placeholder}
                disabled={disabled}
                onChange={handleInputChange}
                onFocus={openWithReset}
                onKeyDown={onKeyDown}
                className={inputClassName ?? DEFAULT_INPUT_CLASS}
            />

            {/* Hidden input per `required` nei form: il browser segnala il campo
                vuoto al submit se nessuna option è stata scelta. */}
            {required && (
                <input
                    type="text"
                    tabIndex={-1}
                    aria-hidden
                    required
                    value={value}
                    onChange={() => { }}
                    className="pointer-events-none absolute left-0 top-1/2 h-0 w-0 -translate-y-1/2 opacity-0"
                />
            )}

            {/* Clear / chevron */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                {value && !disabled ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="pointer-events-auto rounded p-1 text-slate-400 hover:text-slate-600"
                        aria-label="Rimuovi selezione"
                        tabIndex={-1}
                    >
                        ✕
                    </button>
                ) : (
                    <span className="text-xs text-slate-400" aria-hidden>
                        ▾
                    </span>
                )}
            </div>

            {open && (
                <ul
                    ref={listRef}
                    id={listboxId}
                    role="listbox"
                    className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
                >
                    {filtered.length === 0 ? (
                        <li className="px-3 py-2 text-slate-400">{noOptionsMessage}</li>
                    ) : (
                        filtered.map((opt, i) => {
                            const isSelected = opt.value === value;
                            const isHighlighted = i === highlight;
                            return (
                                <li
                                    key={opt.value}
                                    role="option"
                                    aria-selected={isSelected}
                                    aria-disabled={opt.disabled || undefined}
                                    onMouseDown={(e) => {
                                        // mousedown anziché click: previene il blur dell'input prima del select.
                                        e.preventDefault();
                                        commit(opt);
                                    }}
                                    onMouseEnter={() => !opt.disabled && setHighlight(i)}
                                    className={[
                                        "cursor-pointer px-3 py-2",
                                        opt.disabled ? "cursor-not-allowed text-slate-300" : "text-slate-800",
                                        !opt.disabled && isHighlighted ? "bg-blue-50" : "",
                                        isSelected ? "font-semibold" : "",
                                    ].join(" ")}
                                >
                                    {opt.label}
                                </li>
                            );
                        })
                    )}
                </ul>
            )}
        </div>
    );
}
