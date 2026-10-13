import Link from "next/link";

export default function BuyPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Buy</h1>
      <p>Browse homes for sale.</p>
      <p>
        <Link href="/properties">View properties</Link>
      </p>
    </main>
  );
}
