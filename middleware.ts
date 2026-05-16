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
  "/shop/cart",
  "/shop/checkout",
  // api
  "/api/admin",
  "/api/cart",
  "/api/inventory",
  "/api/products",
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

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("callbackUrl", pathname);
    // if unauthenticated, redirect to login page with callbackUrl to return after login
    return NextResponse.redirect(url);
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
    // api
    "/api/admin/:path*",
    "/api/cart/:path*",
    "/api/inventory/:path*",
    "/api/products/:path*",
  ],
};
