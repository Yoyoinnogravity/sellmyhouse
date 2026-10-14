import Link from "next/link";
import { Suspense } from "react";
import { currentSite } from "@/lib/site";

const waysToBuy = [
  {
    href: "/properties",
    title: "Browse private sales",
    detail: "Homes offered by individual owners.",
  },
  {
    href: "/properties?sale=developer",
    title: "Browse developer units",
    detail: "Homes in licensed developments.",
  },
  {
    href: "/solicitors",
    title: "Choose a conveyancer",
    detail: "Local conveyancing solicitors, with phone and email.",
  },
];

export default function BuyPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Buy</h1>
      <Suspense fallback={<p>Choose how you want to buy.</p>}>
        <BuyIntro />
      </Suspense>
      <ul className="grid gap-4 sm:grid-cols-3">
        {waysToBuy.map((way) => (
          <li key={way.href}>
            <Link href={way.href} className="flex h-full flex-col gap-2 border p-4">
              <span className="text-lg font-semibold">{way.title}</span>
              <span>{way.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Suspense fallback={<p>Listing your property for sale is free.</p>}>
        <BuyFooter />
      </Suspense>
    </main>
  );
}

async function BuyIntro() {
  const site = await currentSite();
  return <p>Choose how you want to buy {site.withArticle}.</p>;
}

async function BuyFooter() {
  const site = await currentSite();
  return (
    <p>
      Listing your {site.noun} for sale is free. <Link href="/sell">Sell {site.withArticle}</Link>
    </p>
  );
}
