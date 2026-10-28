"use client";

import Link from "next/link";

// Shown instead of a blank crash when a page can't load, for example while
// the database is briefly unavailable.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">This page didn&apos;t load</h1>
      <p className="text-zinc-600">
        Something went wrong on our side, usually for just a minute or two. Please try again.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => reset()} className="border px-4 py-2 font-semibold">
          Try again
        </button>
        <Link href="/" className="border px-4 py-2">
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
