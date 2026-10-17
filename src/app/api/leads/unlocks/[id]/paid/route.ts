import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/developerAccess";
import { LEAD_SLOTS } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/lib/session";

// The admin confirms an agent's bank transfer arrived. The seller's number
// is released to that agent; the lead closes once three agents have paid.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { id } = await params;
  const unlockId = Number(id);
  if (!Number.isInteger(unlockId)) {
    return NextResponse.json({ error: "Unknown transfer." }, { status: 404 });
  }

  const unlock = await prisma.leadUnlock.findUnique({
    where: { id: unlockId },
    select: { id: true, leadId: true, status: true },
  });
  if (!unlock) {
    return NextResponse.json({ error: "Unknown transfer." }, { status: 404 });
  }
  if (unlock.status !== "requested") {
    return NextResponse.json({ error: "That transfer is already recorded." }, { status: 400 });
  }

  await prisma.leadUnlock.update({
    where: { id: unlock.id },
    data: { status: "paid", paidAt: new Date() },
  });

  const paid = await prisma.leadUnlock.count({
    where: { leadId: unlock.leadId, status: "paid" },
  });
  let leadStatus = "open";
  if (paid >= LEAD_SLOTS) {
    leadStatus = "closed";
    await prisma.lead.update({ where: { id: unlock.leadId }, data: { status: "closed" } });
  }

  return NextResponse.json({ ok: true, leadStatus });
}
