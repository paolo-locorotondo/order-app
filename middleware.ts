import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Define protected routes that require authentication
const protectedRoutes = [
  // pages
  "/dashboard",
  "/dashboard/orders",
  "/dashboard/admin/users",
  "/dashboard/admin/products",
  "/dashboard/admin/inventory",
  "/dashboard/admin/orders",
  "/shop/products",
  "/shop/cart",
  "/shop/checkout",
  "/user",
  // api
  "/api/admin",
  "/api/cart",
  "/api/inventory",
  "/api/products",
  "/api/user",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public access to auth routes, static files, and Next.js internals
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const isProtected = protectedRoutes.some((path) => pathname.startsWith(path));

  if (!isProtected) {
    // If the route is not protected, allow access without checking authentication
    return NextResponse.next();
  }

  // In produzione (Vercel HTTPS) il cookie si chiama `__Secure-next-auth.session-token`;
  // in dev (HTTP) si chiama `next-auth.session-token`. `secureCookie` esplicito forza
  // getToken a cercare il cookie giusto — l'auto-detection dal req in alcuni edge case
  // su Vercel non basta e il middleware redirezionerebbe utenti già autenticati.
  const isSecure =
    process.env.NEXTAUTH_URL?.startsWith("https://") ||
    process.env.NODE_ENV === "production";

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isSecure,
  });

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("callbackUrl", pathname);
    // if unauthenticated, redirect to login page with callbackUrl to return after login
    const redirect = NextResponse.redirect(url);
    // Evita che Next/Vercel/browser cachino questa redirect: il prefetch del Link
    // fatto da non-autenticati cacherebbe il 307 e dopo login il click userebbe
    // ancora la cache vecchia rispedendo a /auth/login.
    redirect.headers.set("Cache-Control", "no-store, must-revalidate");
    return redirect;
  } else {
    // If token exists, allow access to the protected route
    return NextResponse.next();
  }
}

// nel matcher ci sono tutti i path che saranno utilizzati per la verifica di questo middleware
export const config = {
  matcher: [
    // pages
    "/shop/:path*",
    "/dashboard/:path*",
    "/user/:path*",
    // api
    "/api/admin/:path*",
    "/api/cart/:path*",
    "/api/inventory/:path*",
    "/api/products/:path*",
    "/api/user/:path*",
  ],
};
