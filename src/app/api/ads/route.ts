import { after, NextResponse } from "next/server";
import { cached } from "@/lib/queryCache";
import { directoryFirms, firmLink } from "@/lib/conveyancerDirectory";
import { listSolicitors } from "@/lib/solicitor";

export const maxDuration = 60;

// Visitors browsing also keep the stock growing: at most every 15 minutes
// per server, after the response is sent, this asks the import and photo
// jobs (which run in Singapore, near the housing register) for another
// batch. GitHub's schedule calls the same jobs, but it can't be relied on.
const KICK_EVERY_MS = 15 * 60 * 1000;
let lastKick = 0;

function kickJobs(origin: string) {
  if (Date.now() - lastKick < KICK_EVERY_MS) return;
  lastKick = Date.now();
  const headers: Record<string, string> = process.env.CRON_SECRET ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {};
  after(async () => {
    for (const job of ["developments", "media"]) {
      try {
        await fetch(`${origin}/api/cron/${job}`, { headers, signal: AbortSignal.timeout(55_000), cache: "no-store" });
      } catch {
        // The next kick or the schedule tries again.
      }
    }
  });
}

// Conveyancers to show in the side adverts for the visitor's place of interest.
export async function GET(request: Request) {
  kickJobs(new URL(request.url).origin);
  const place = (new URL(request.url).searchParams.get("place") ?? "").trim().slice(0, 120);
  try {
    const solicitors = place
      ? await cached(`ads:${place.toLowerCase()}`, async () =>
          (await listSolicitors(place))
            // Placeholder seed firms use .example addresses; never show them.
            .filter((solicitor) => !solicitor.email.toLowerCase().endsWith(".example"))
            .slice(0, 3)
            .map((solicitor) => ({
            id: solicitor.id,
            name: solicitor.name,
            firm: solicitor.firm,
            city: solicitor.city,
            country: solicitor.country,
            phone: solicitor.phone,
            email: solicitor.email,
          })),
        )
      : [];
    const directory = directoryFirms(place, Math.max(0, 3 - solicitors.length)).map((entry) => ({
      firm: entry.firm,
      city: entry.city,
      country: entry.country,
      href: firmLink(entry),
    }));
    return NextResponse.json(
      { place, solicitors, directory },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } },
    );
  } catch {
    return NextResponse.json({ place, solicitors: [], directory: [] });
  }
}
