import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Test DB connection
    const userCount = await prisma.user.count();

    // Test if Account table exists and is queryable
    const accountCount = await prisma.account.count();

    return NextResponse.json({
      status: "ok",
      db: "connected",
      users: userCount,
      accounts: accountCount,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL || "(not set)",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
