import { NextResponse } from "next/server";

// If you ever re-enable this later, you can remove this file or restore BlockVision logic.
// For now: keep it deterministic and stable.
export const revalidate = 300;

export async function GET() {
  const payload = {
    disabled: true,
    reason: "BlockVision insights temporarily disabled to avoid rate limits and inconsistent data.",
    updatedAtMs: Date.now(),
  };

  const res = NextResponse.json(payload);
  res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res;
}
