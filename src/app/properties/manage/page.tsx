import { Suspense } from "react";
import { requireUser } from "@/lib/session";

export default function ManagePropertiesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Manage properties
      </h1>
      <Suspense fallback={<p>Loading account…</p>}>
        <ManageAccount />
      </Suspense>
    </main>
  );
}

async function ManageAccount() {
  const user = await requireUser();
  return <p>Signed in as {user.email}</p>;
}
