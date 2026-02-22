import { NextRequest } from "next/server";
import { requireAuth, apiSuccess, apiError, handleApiError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    if (!body.data) {
      return apiError("Invalid import format. Expected { data: { deals, tools, ... } }", 400);
    }

    // Delegate to individual import endpoints
    const results: Record<string, number> = {};

    if (body.data.deals?.length > 0) {
      const res = await fetch(new URL("/api/deals/import", req.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: req.headers.get("Cookie") || "",
        },
        body: JSON.stringify({ deals: body.data.deals }),
      });
      const data = await res.json();
      results.deals = data.imported || 0;
    }

    if (body.data.tools?.tools?.length > 0) {
      const res = await fetch(new URL("/api/tools/import", req.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: req.headers.get("Cookie") || "",
        },
        body: JSON.stringify(body.data.tools),
      });
      const data = await res.json();
      results.tools = data.imported?.tools || 0;
    }

    return apiSuccess({ imported: results }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
