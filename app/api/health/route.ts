import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, unknown> = {};

  // 1. DB connection
  try {
    checks.userCount = await prisma.user.count();
    checks.accountCount = await prisma.account.count();
    checks.db = "ok";
  } catch (e: unknown) {
    checks.db = e instanceof Error ? e.message : String(e);
  }

  // 2. Env vars
  checks.env = {
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlLength: process.env.DATABASE_URL?.length,
    hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
    googleIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10),
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL || "(not set)",
    authTrustHost: process.env.AUTH_TRUST_HOST || "(not set)",
  };

  // 3. Google OIDC discovery
  try {
    const res = await fetch("https://accounts.google.com/.well-known/openid-configuration");
    checks.googleOidc = res.ok ? "reachable" : `status ${res.status}`;
  } catch (e: unknown) {
    checks.googleOidc = e instanceof Error ? e.message : String(e);
  }

  // 4. Try importing and calling auth to see if it errors
  try {
    const { auth } = await import("@/lib/auth");
    checks.authImport = "ok";
    // Try to get a session (will be null for unauthenticated)
    const session = await auth();
    checks.authSession = session ? "has session" : "no session (expected)";
  } catch (e: unknown) {
    checks.authImport = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    if (e instanceof Error && e.stack) {
      checks.authStack = e.stack.split("\n").slice(0, 5).join("\n");
    }
  }

  return NextResponse.json(checks);
}
