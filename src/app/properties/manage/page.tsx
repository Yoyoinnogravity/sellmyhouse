import Link from "next/link";
import { isAdminEmail } from "@/lib/developerAccess";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const instant = false;

export default async function ManagePropertiesPage() {
  const user = await requireUser("/properties/manage");
  const admin = isAdminEmail(user.email);
  const rows = await prisma.property.findMany({
    where: admin ? { developerVerified: true } : { claimedById: user.id },
    orderBy: { id: "asc" },
    take: 200,
    select: { id: true, title: true, price: true, location: true, developerVerified: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Manage properties</h1>
      <p className="max-w-xl">
        Signed in as {user.email}.{" "}
        {rows.length === 0 ? (
          <>
            No claimed listings yet. <Link href="/developers">Claim your development</Link> to fix
            its details and photos.
          </>
        ) : (
          "Choose a listing to correct its details and photos."
        )}
      </p>
      {rows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border p-3">
              <span className="min-w-0 flex-1">
                <strong>{row.title}</strong>
                <br />
                <span className="text-sm text-zinc-600">
                  {row.location} · RM {row.price.toLocaleString()}
                  {row.developerVerified ? " · Verified developer" : ""}
                </span>
              </span>
              <Link href={`/properties/manage/${row.id}`} className="border px-4 py-2 font-semibold">
                Edit
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
