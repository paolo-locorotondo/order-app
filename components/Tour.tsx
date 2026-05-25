"use client";

import { useEffect, useState, useCallback } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_FLAG_KEY = "tour-completed";
export const TOUR_RESTART_EVENT = "tour:restart";

function buildSteps(): DriveStep[] {
    const steps: DriveStep[] = [];

    if (document.querySelector("#tour-shop")) {
        steps.push({
            element: "#tour-shop",
            popover: {
                title: "🛍️ Esplora i prodotti",
                description:
                    "Da qui accedi al catalogo: sfoglia i prodotti disponibili, aggiungili al carrello o aprine uno per vederne i dettagli.",
                side: "bottom",
                align: "center",
            },
        });
    }

    if (document.querySelector("#tour-cart")) {
        steps.push({
            element: "#tour-cart",
            popover: {
                title: "🛒 Il tuo carrello",
                description:
                    "I prodotti che aggiungi finiscono qui. Quando sei pronto puoi procedere al checkout.",
                side: "bottom",
                align: "center",
            },
        });
    }

    if (document.querySelector("#tour-dashboard")) {
        steps.push({
            element: "#tour-dashboard",
            popover: {
                title: "📋 La tua dashboard",
                description:
                    "Qui trovi lo storico dei tuoi ordini e il loro stato (in attesa, spediti, consegnati...).",
                side: "bottom",
                align: "center",
            },
        });
    }

    return steps;
}

function startDriver(onDone: () => void) {
    const steps = buildSteps();
    if (steps.length === 0) {
        onDone();
        return;
    }
    const drv = driver({
        showProgress: true,
        nextBtnText: "Avanti",
        prevBtnText: "Indietro",
        doneBtnText: "Fine",
        progressText: "{{current}} di {{total}}",
        onDestroyed: () => onDone(),
        steps,
    });
    drv.drive();
}

export default function Tour() {
    const [showWelcome, setShowWelcome] = useState(false);

    const markCompleted = useCallback(() => {
        try {
            localStorage.setItem(TOUR_FLAG_KEY, "true");
        } catch {
            // localStorage potrebbe non essere disponibile (incognito strict, ecc.); il tour
            // riapparirà al prossimo accesso, accettabile come fallback.
        }
    }, []);

    const openWelcomeIfFirstTime = useCallback(() => {
        try {
            if (localStorage.getItem(TOUR_FLAG_KEY) !== "true") {
                setShowWelcome(true);
            }
        } catch {
            setShowWelcome(true);
        }
    }, []);

    useEffect(() => {
        openWelcomeIfFirstTime();
    }, [openWelcomeIfFirstTime]);

    useEffect(() => {
        const handler = () => {
            try {
                localStorage.removeItem(TOUR_FLAG_KEY);
            } catch { /* ignore */ }
            setShowWelcome(true);
        };
        window.addEventListener(TOUR_RESTART_EVENT, handler);
        return () => window.removeEventListener(TOUR_RESTART_EVENT, handler);
    }, []);

    const handleStart = () => {
        setShowWelcome(false);
        // Aspetto un tick per essere certo che l'overlay sia smontato prima che driver.js
        // calcoli le bounding box degli elementi target.
        setTimeout(() => {
            startDriver(() => markCompleted());
        }, 50);
    };

    const handleSkip = () => {
        markCompleted();
        setShowWelcome(false);
    };

    if (!showWelcome) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
                <h2 className="text-xl font-bold text-slate-900">👋 Benvenuto in Order App!</h2>
                <p className="mt-3 text-sm text-slate-700">
                    Vuoi un tour rapido (3 step) per scoprire come navigare l&apos;app?
                </p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        onClick={handleSkip}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        No, grazie
                    </button>
                    <button
                        onClick={handleStart}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Sì, fammi vedere
                    </button>
                </div>
            </div>
        </div>
    );
}

export function RestartTourButton({ className }: { className?: string }) {
    const onClick = () => window.dispatchEvent(new Event(TOUR_RESTART_EVENT));
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                className ??
                "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            }
        >
            <span aria-hidden>🎯</span>
            <span>Riavvia tutorial</span>
        </button>
    );
}
