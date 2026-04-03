"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
      <div className="text-lg font-bold">Order App</div>
      <nav className="flex items-center gap-4">
        <Link href="/">Home</Link>
        <Link href="/shop">Shop</Link>
        <Link href="/shop/cart">Carrello</Link>
        {session?.user ? <Link href="/dashboard">Dashboard</Link> : null}
        {status === "authenticated" ? (
          <>
            <span className="text-sm">Ciao, {session.user.name ?? session.user.email}</span>
            <button onClick={() => signOut()} className="btn-primary">
              Logout
            </button>
          </>
        ) : (
          <Link href="/auth/login" className="btn-primary">
            Accedi
          </Link>
        )}
      </nav>
    </header>
  );
}
