import { requireUser } from "@/lib/session";
import DeveloperClaimForm from "./claim-form";

export const instant = false;

export default async function DevelopersPage() {
  await requireUser("/developers");
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Developers: correct your listings</h1>
      <p className="max-w-xl">
        Our project data comes from public registries and may be out of date. Search for your
        development below, tick your listings, and request edit access. Once we verify you, you can
        fix prices, contacts, and photos yourself.
      </p>
      <DeveloperClaimForm />
    </main>
  );
}
