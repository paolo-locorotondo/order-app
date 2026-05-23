"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CART_CHANGED_EVENT } from "@/lib/cart-events";

export default function Header() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const refreshCartCount = useCallback(async () => {
    if (status !== "authenticated") {
      setCartCount(0);
      return;
    }
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) {
        setCartCount(0);
        return;
      }
      const json = await res.json();
      const items: { quantity: number }[] = json?.data ?? [];
      const total = items.reduce((sum, it) => sum + (it.quantity ?? 0), 0);
      setCartCount(total);
    } catch {
      setCartCount(0);
    }
  }, [status]);

  // Fetch iniziale + ogni cambio di sessione.
  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount]);

  // Refetch quando un altro componente segnala una modifica del carrello.
  useEffect(() => {
    const handler = () => refreshCartCount();
    window.addEventListener(CART_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CART_CHANGED_EVENT, handler);
  }, [refreshCartCount]);

  // Chiudi il menu mobile su click fuori dal pannello.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const cartBadge =
    cartCount > 0 ? (
      <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
        {cartCount > 99 ? "99+" : cartCount}
      </span>
    ) : null;

  const iconLinks = (
    <>
      <Link
        href="/shop"
        onClick={closeMenu}
        className="flex items-center gap-1 rounded p-2 text-slate-700 hover:bg-slate-100"
        aria-label="Shop"
        title="Shop"
      >
        <span className="text-xl leading-none">🛍️</span>
        <span className="hidden text-sm md:inline">Shop</span>
      </Link>
      <Link
        href="/shop/cart"
        prefetch={false}
        onClick={closeMenu}
        className="relative flex items-center gap-1 rounded p-2 text-slate-700 hover:bg-slate-100"
        aria-label={`Carrello${cartCount > 0 ? ` (${cartCount})` : ""}`}
        title="Carrello"
      >
        <span className="relative text-xl leading-none">
          🛒
          {cartBadge}
        </span>
        <span className="hidden text-sm md:inline">Carrello</span>
      </Link>
      {session?.user ? (
        <Link
          href="/dashboard"
          prefetch={false}
          onClick={closeMenu}
          className="flex items-center gap-1 rounded p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Dashboard"
          title="Dashboard"
        >
          <span className="text-xl leading-none">📋</span>
          <span className="hidden text-sm md:inline">Dashboard</span>
        </Link>
      ) : null}
    </>
  );

  const authSection = (onClick?: () => void) =>
    status === "authenticated" ? (
      <>
        <span className="text-sm">Ciao, {session.user?.name ?? session.user?.email}</span>
        <button
          onClick={() => {
            onClick?.();
            signOut();
          }}
          className="btn-primary"
        >
          Logout
        </button>
      </>
    ) : (
      <Link href="/auth/login" className="btn-primary" onClick={onClick}>
        Accedi
      </Link>
    );

  return (
    <header className="relative flex items-center justify-between border-b bg-white p-4 shadow-sm">
      <Link href="/" aria-label="Home" className="flex items-center text-lg font-bold">
        <span className="text-2xl leading-none md:hidden">🏠</span>
        <span className="hidden md:inline">Order App</span>
      </Link>

      {/* Icone sempre visibili (mobile + desktop) */}
      <nav className="flex items-center gap-1 sm:gap-2">
        {iconLinks}

        {/* Auth section: solo su desktop */}
        <div className="ml-2 hidden items-center gap-3 md:flex">{authSection()}</div>

        {/* Hamburger: solo su mobile, contiene Home + auth */}
        <div className="md:hidden" ref={menuRef}>
          <button
            aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded p-2 text-2xl leading-none text-slate-700 hover:bg-slate-100"
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          {menuOpen && (
            <div className="absolute right-4 top-full z-40 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
              <nav className="flex flex-col gap-1 p-2 [&>a]:flex [&>a]:items-center [&>a]:gap-2 [&>a]:rounded [&>a]:px-3 [&>a]:py-2 [&>a]:text-slate-700 [&>a:hover]:bg-slate-100">
                <Link href="/" onClick={closeMenu}>
                  <span className="text-lg leading-none">🏠</span>
                  <span>Home</span>
                </Link>
                <Link href="/shop" onClick={closeMenu}>
                  <span className="text-lg leading-none">🛍️</span>
                  <span>Shop</span>
                </Link>
                <Link href="/shop/cart" prefetch={false} onClick={closeMenu}>
                  <span className="relative text-lg leading-none">
                    🛒
                    {cartBadge}
                  </span>
                  <span>Carrello</span>
                </Link>
                {session?.user ? (
                  <Link href="/dashboard" prefetch={false} onClick={closeMenu}>
                    <span className="text-lg leading-none">📋</span>
                    <span>Dashboard</span>
                  </Link>
                ) : null}
              </nav>
              <div className="flex flex-col items-start gap-2 border-t border-slate-100 p-3">
                {authSection(closeMenu)}
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
