"use client";

import { useSyncExternalStore } from "react";
import { fetchStore } from "@/lib/fetch";

const serverSnapshot = () => 0;

export default function GlobalLoader() {
    const count = useSyncExternalStore(fetchStore.subscribe, fetchStore.getSnapshot, serverSnapshot);

    if (count <= 0) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
            role="status"
        >
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/40 border-t-white" />
            <span className="sr-only">Caricamento in corso</span>
        </div>
    );
}
