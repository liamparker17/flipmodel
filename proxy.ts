import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/signup", "/onboarding", "/api/auth", "/api/accounting/webhooks", "/api/health", ...(process.env.NODE_ENV === "development" ? ["/api/dev"] : [])];

// CSRF double-submit cookie protection
function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow public paths (skip auth check and CSRF for these)
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for auth session token (JWT cookie set by next-auth)
  const token =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // CSRF protection
  const response = NextResponse.next();
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(req.method);

  if (safeMethod) {
    // Set CSRF cookie on safe requests if not present
    if (!req.cookies.get("csrf-token")) {
      const csrfToken = generateCsrfToken();
      response.cookies.set("csrf-token", csrfToken, {
        httpOnly: false, // Client needs to read this
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    return response;
  }

  // For state-changing methods on API routes, validate CSRF token
  if (pathname.startsWith("/api/")) {
    const cookieToken = req.cookies.get("csrf-token")?.value;
    const headerToken = req.headers.get("x-csrf-token");

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json(
        { error: "Invalid or missing CSRF token" },
        { status: 403 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
