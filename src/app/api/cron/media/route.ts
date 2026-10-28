import { NextResponse } from "next/server";
import { fillDevelopmentMedia } from "@/lib/developmentMedia";

// Adds developer photos to a few imported developments per call.
// Called by .github/workflows/populate.yml after each import.
export const preferredRegion = "sin1";
export const maxDuration = 60;

let running = false;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  if (running) return NextResponse.json({ skipped: "Already running." });
  running = true;
  try {
    return NextResponse.json(await fillDevelopmentMedia(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 502 });
  } finally {
    running = false;
  }
}
