import { NextRequest, NextResponse } from "next/server";
import { seed } from "../../../../prisma/seed";

// This endpoint runs the demo-data seed logic on the current database.
// Protected by a simple bearer token check so it can be triggered on Vercel.

export async function GET(req: NextRequest) {
  // Allow seeding if: not production, OR correct bearer token provided
  const authHeader = req.headers.get("authorization");
  const seedToken = process.env.SEED_TOKEN; // optional env var for protected access
  const isAuthorised =
    process.env.NODE_ENV !== "production" ||
    (seedToken && authHeader === `Bearer ${seedToken}`);

  if (!isAuthorised) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  try {
    await seed();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("dev/seed error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
