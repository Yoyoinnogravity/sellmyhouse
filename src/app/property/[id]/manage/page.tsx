import ManageListing from "./manage-listing";

export const instant = false;

export default async function ManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Check or edit your listing</h1>
      <ManageListing id={Number(id)} />
    </main>
  );
}
