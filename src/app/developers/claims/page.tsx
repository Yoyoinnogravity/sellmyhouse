import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/developerAccess";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/lib/session";
import ClaimsQueue from "./claims-queue";

export const instant = false;

export default async function ClaimsPage() {
  const user = await getUserFromCookie();
  if (!user) {
    redirect("/login?next=%2Fdevelopers%2Fclaims");
  }
  if (!isAdminEmail(user.email)) {
    redirect("/developers");
  }

  const claims = await prisma.developerClaim.findMany({
    where: { status: "pending" },
    orderBy: { id: "desc" },
    take: 100,
    select: {
      id: true,
      company: true,
      contactEmail: true,
      contactPhone: true,
      listingIds: true,
      status: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Developer requests</h1>
      <p className="max-w-xl">
        Verify each company before approving. Approval hands them edit access to the listings they
        ticked and marks those listings as developer-verified.
      </p>
      <ClaimsQueue
        initial={claims.map((claim) => ({ ...claim, createdAt: claim.createdAt.toISOString() }))}
      />
    </main>
  );
}
