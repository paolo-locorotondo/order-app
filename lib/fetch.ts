// Wrapper per fetch che traccia un counter globale di chiamate in volo.
// Usato dal `GlobalLoader` per mostrare un overlay durante operazioni di scrittura.
//
// Convenzione: usa `apiFetch` per le chiamate dove vuoi che l'utente veda
// il loader (POST/PUT/DELETE/PATCH user-initiated). Per le GET silenti
// (poll del cart count nell'Header, lettura di reservations background, ecc.)
// usa il `fetch` nativo: non vogliamo lampeggiare a ogni page-load.

let pendingCount = 0;
const listeners = new Set<() => void>();

const notify = () => {
  for (const l of listeners) l();
};

export const fetchStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => pendingCount,
};

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  pendingCount++;
  notify();
  try {
    return await fetch(input, init);
  } finally {
    pendingCount--;
    notify();
  }
}
