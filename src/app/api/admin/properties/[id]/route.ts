import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/developerAccess";
import { removeListing } from "@/lib/listingRemoval";
import { getUserFromCookie } from "@/lib/session";

// Admin only: remove any listing (sellers who lost their link, spam,
// sold-out developments).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCookie();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  const id = Number((await params).id);
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (!Number.isInteger(id) || body.action !== "remove") {
    return NextResponse.json({ error: "Unknown request." }, { status: 400 });
  }
  const result = await removeListing(id);
  if (result === "missing") return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  return NextResponse.json({ ok: true, result });
}
