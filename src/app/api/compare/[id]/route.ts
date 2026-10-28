import { NextResponse } from "next/server";
import { cached } from "@/lib/queryCache";
import { comparePrices } from "@/lib/priceCompare";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ blocks: [] }, { status: 404 });
  try {
    const blocks = await cached(`compare:${id}`, () => comparePrices(id));
    return NextResponse.json({ blocks }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } });
  } catch {
    return NextResponse.json({ blocks: [] });
  }
}
