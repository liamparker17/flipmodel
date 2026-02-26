import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("test_auth");

  if (email) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ status: "error", detail: "user_not_found", email });
      }
      const hasPassword = !!user.passwordHash;
      const passwordValid = hasPassword
        ? await bcrypt.compare("demo1234", user.passwordHash!)
        : false;

      const member = await prisma.orgMember.findFirst({
        where: { userId: user.id, isActive: true },
      });

      return NextResponse.json({
        status: "ok",
        email: user.email,
        userId: user.id,
        hasPassword,
        passwordValid,
        hasOrg: !!member,
        orgRole: member?.role || null,
      });
    } catch (e) {
      return NextResponse.json({
        status: "error",
        detail: "db_error",
        message: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  // Default health check
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      dbConnected: true,
      userCount,
    });
  } catch (e) {
    return NextResponse.json({
      status: "error",
      dbConnected: false,
      message: e instanceof Error ? e.message : "unknown",
    });
  }
}
