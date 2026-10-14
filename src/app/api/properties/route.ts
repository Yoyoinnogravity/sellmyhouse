import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Search imported (TEDUH) listings so developers can find their projects to claim.
export async function GET(request: Request) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim().slice(0, 80);
  if (search.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const rows = await prisma.property.findMany({
    where: {
      metadata: { contains: '"register":"TEDUH"' },
      claimedById: null,
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ],
    },
    orderBy: { id: "asc" },
    take: 30,
    select: { id: true, title: true, price: true, location: true },
  });

  return NextResponse.json({ items: rows });
}
