import Link from "next/link";

const choices = [
  { href: "/buy", label: "I'm just browsing" },
  { href: "/sell", label: "I want to test the market" },
  { href: "/solicitors", label: "I need legal help" },
  { href: "/agents", label: "I want an agent" },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-16">
      <section className="mx-auto flex w-full max-w-lg flex-col items-center gap-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Sell My House</h1>
        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <Link
            href="/buy"
            className="flex min-h-28 flex-1 items-center justify-center border text-2xl font-semibold"
          >
            BUY
          </Link>
          <Link
            href="/sell"
            className="flex min-h-28 flex-1 items-center justify-center border text-2xl font-semibold"
          >
            SELL
          </Link>
        </div>
        <ul className="flex flex-col gap-3">
          {choices.map((choice) => (
            <li key={choice.href + choice.label}>
              <Link href={choice.href}>{choice.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
