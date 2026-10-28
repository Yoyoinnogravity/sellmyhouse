import { NextResponse } from "next/server";
import { fillDevelopmentMedia } from "@/lib/developmentMedia";

// Adds developer photos to a few imported developments per call.
// Called by .github/workflows/populate.yml after each import.
export const preferredRegion = "sin1";
export const maxDuration = 60;

// Start time of a run in progress. A run cut off by the time limit never
// clears it, so it counts as finished after 70 seconds.
let startedAt = 0;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  if (Date.now() - startedAt < 70_000) return NextResponse.json({ skipped: "Already running." });
  startedAt = Date.now();
  try {
    return NextResponse.json(await fillDevelopmentMedia(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 502 });
  } finally {
    startedAt = 0;
  }
}
