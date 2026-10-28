import { NextResponse } from "next/server";
import { runTeduhImport } from "@/lib/teduhImport";

// Adds a few real developments from Malaysia's public housing register on
// each call. Called every 15 minutes by .github/workflows/populate.yml.
// If CRON_SECRET is set in Vercel, callers must send it as a Bearer token.
export const preferredRegion = "sin1"; // Singapore: close to the register's servers
export const maxDuration = 60;

let lastRun = 0;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  // One run at a time, and at most one a minute per server.
  if (Date.now() - lastRun < 60_000) {
    return NextResponse.json({ skipped: "A run happened in the last minute." });
  }
  lastRun = Date.now();
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state") ?? undefined;
    const page = Number(url.searchParams.get("page")) || undefined;
    const result = await runTeduhImport({ state, page });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
