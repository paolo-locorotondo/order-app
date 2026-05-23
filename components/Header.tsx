"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const navLinks = (
    <>
      <Link href="/" onClick={closeMenu}>Home</Link>
      <Link href="/shop" onClick={closeMenu}>Shop</Link>
      <Link href="/shop/cart" prefetch={false} onClick={closeMenu}>Carrello</Link>
      {session?.user ? (
        <Link href="/dashboard" prefetch={false} onClick={closeMenu}>Dashboard</Link>
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
      <Link href="/" className="text-lg font-bold">
        Order App
      </Link>

      {/* DESKTOP nav (>= md) */}
      <nav className="hidden items-center gap-4 md:flex">
        {navLinks}
        {authSection()}
      </nav>

      {/* MOBILE hamburger (< md) */}
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
            <nav className="flex flex-col gap-1 p-2 [&>a]:rounded [&>a]:px-3 [&>a]:py-2 [&>a]:text-slate-700 [&>a:hover]:bg-slate-100">
              {navLinks}
            </nav>
            <div className="flex flex-col items-start gap-2 border-t border-slate-100 p-3">
              {authSection(closeMenu)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
