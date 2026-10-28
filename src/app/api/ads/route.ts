import { NextResponse } from "next/server";
import { cached } from "@/lib/queryCache";
import { directoryFirms, firmLink } from "@/lib/conveyancerDirectory";
import { listSolicitors } from "@/lib/solicitor";

// Conveyancers to show in the side adverts for the visitor's place of interest.
export async function GET(request: Request) {
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
