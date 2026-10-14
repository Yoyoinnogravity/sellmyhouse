import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/developerAccess";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/lib/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { id } = await params;
  const claimId = Number(id);
  if (!Number.isInteger(claimId)) {
    return NextResponse.json({ error: "Unknown request." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const approve = (body as { approve?: unknown } | null)?.approve === true;

  const claim = await prisma.developerClaim.findUnique({ where: { id: claimId } });
  if (!claim || claim.status !== "pending") {
    return NextResponse.json({ error: "That request is already decided." }, { status: 400 });
  }

  let ids: number[] = [];
  try {
    const parsed = JSON.parse(claim.listingIds) as unknown;
    if (Array.isArray(parsed)) {
      ids = parsed.filter((item): item is number => typeof item === "number" && Number.isInteger(item));
    }
  } catch {
    ids = [];
  }

  if (approve && ids.length > 0) {
    await prisma.property.updateMany({
      where: { id: { in: ids }, claimedById: null },
      data: { claimedById: claim.userId, claimedAt: new Date(), developerVerified: true },
    });
  }

  await prisma.developerClaim.update({
    where: { id: claimId },
    data: { status: approve ? "approved" : "rejected", decidedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
