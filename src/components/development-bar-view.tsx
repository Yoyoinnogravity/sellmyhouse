"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const HIDE_KEY = "development-bar-hidden";

// The advert bar along the bottom of every page: a slot offered to
// developers launching a new project. A paid advert can replace the text.
export function DevelopmentBar() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let wasHidden = false;
    try {
      wasHidden = sessionStorage.getItem(HIDE_KEY) === "1";
    } catch {
      // Storage can be blocked; just show the bar.
    }
    setHidden(wasHidden);
  }, []);

  function close() {
    setHidden(true);
    try {
      sessionStorage.setItem(HIDE_KEY, "1");
    } catch {
      // Fine: it stays closed for this page view.
    }
  }

  if (hidden) return null;

  return (
    <>
      {/* Keeps the end of each page clear of the bar. */}
      <div aria-hidden="true" className="h-16" />
      <aside
        aria-label="Advertising space"
        className="fixed inset-x-0 bottom-0 z-[1100] border-t-2 border-orange-500 bg-zinc-900 text-white shadow-[0_-4px_12px_rgb(0_0_0/0.25)]"
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 sm:py-3">
          <span className="hidden shrink-0 bg-orange-500 px-2 py-1 text-xs font-bold tracking-wide uppercase sm:inline">
            Advertise
          </span>
          <Link href="/advertise" className="min-w-0 flex-1 text-[15px] leading-tight font-semibold sm:text-lg">
            Your ad for the next development here
          </Link>
          <Link
            href="/advertise"
            className="inline-flex min-h-[40px] shrink-0 items-center bg-orange-500 px-3 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <span className="sm:hidden">Details</span>
            <span className="hidden sm:inline">Find out more</span>
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label="Close this advert"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-xl text-zinc-300 hover:text-white"
          >
            ×
          </button>
        </div>
      </aside>
    </>
  );
}
