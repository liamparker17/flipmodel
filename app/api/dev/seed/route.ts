import { NextResponse } from "next/server";
import { seed } from "../../../../prisma/seed";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not Found", { status: 404 });
  }
  try {
    await seed();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("dev/seed error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
