import { NextResponse } from "next/server";

// Keep the route present so Next's generated types stay consistent.
// This endpoint is intentionally stubbed (no external API calls).

export const revalidate = 3600;

export async function GET() {
  return NextResponse.json(
    {
      disabled: true,
      message: "Insights endpoint disabled to prevent hosting issues.",
      updatedAtMs: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
