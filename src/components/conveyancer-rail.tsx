"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { shortPlace, useAdPlace } from "@/lib/adPlace";

type Registered = { id: number; name: string; firm: string; city: string | null; country: string; phone: string; email: string };
type Listed = { firm: string; city: string; country: string; href: string };
type Ads = { solicitors: Registered[]; directory: Listed[] };

function searchLink(place: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`conveyancing lawyer ${place}`)}`;
}

// Conveyancing solicitors for the place the visitor is looking at.
// Wide screens: a column on the right. Phones and tablets: a small tab
// that opens the same panel.
export function ConveyancerRail() {
  const interest = useAdPlace();
  const place = shortPlace(interest);
  const [ads, setAds] = useState<Ads>({ solicitors: [], directory: [] });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!interest) {
      setAds({ solicitors: [], directory: [] });
      return;
    }
    let live = true;
    fetch(`/api/ads?place=${encodeURIComponent(interest)}`)
      .then((response) => response.json())
      .then((data: Ads) => {
        if (live) setAds({ solicitors: data.solicitors ?? [], directory: data.directory ?? [] });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [interest]);

  const panel = (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-bold tracking-wide text-orange-700 uppercase">Conveyancing</p>
        <h2 className="text-lg leading-tight font-semibold">
          {place ? `Conveyancing solicitors in ${place}` : "Conveyancing solicitors"}
        </h2>
      </div>

      {ads.solicitors.map((solicitor) => (
        <div key={solicitor.id} className="flex flex-col gap-1 border bg-white p-3">
          <p className="font-semibold">{solicitor.firm}</p>
          <p className="text-sm text-zinc-600">
            {solicitor.name}
            {solicitor.city ? ` · ${solicitor.city}` : ""}
          </p>
          <div className="flex gap-3 text-sm">
            <a href={`tel:${solicitor.phone.replace(/[^0-9+]/g, "")}`} className="underline">Call</a>
            <a href={`mailto:${solicitor.email}`} className="underline">Email</a>
          </div>
        </div>
      ))}

      {ads.directory.length > 0 ? (
        <div className="flex flex-col gap-2">
          {ads.directory.map((firm) => (
            <a
              key={firm.firm}
              href={firm.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col border bg-white p-3 hover:border-zinc-500"
            >
              <span className="font-semibold">{firm.firm}</span>
              <span className="text-sm text-zinc-600">{firm.city}, {firm.country}</span>
            </a>
          ))}
          <p className="text-xs text-zinc-500">Listed from public directories. Not paid adverts or recommendations.</p>
        </div>
      ) : null}

      {place ? (
        <a href={searchLink(place)} target="_blank" rel="noopener noreferrer" className="text-sm underline">
          Search more conveyancers in {place}
        </a>
      ) : (
        <p className="text-sm text-zinc-600">Search a town to see local conveyancers.</p>
      )}

      <Link
        href="/advertise"
        className="flex flex-col gap-1 border-2 border-dashed border-orange-400 bg-orange-50 p-3 hover:border-orange-600"
      >
        <span className="font-semibold">Your conveyancing ad here</span>
        <span className="text-sm text-zinc-700">
          Reach buyers and sellers{place ? ` in ${place}` : ""}. Find out more
        </span>
      </Link>
      <Link href="/solicitors" className="text-sm underline">All conveyancers</Link>
    </div>
  );

  return (
    <>
      {/* Wide screens: a fixed column on the right. */}
      <aside
        aria-label="Conveyancing solicitors"
        className="fixed top-24 right-0 bottom-16 z-[900] hidden w-64 overflow-y-auto border-l bg-zinc-50 p-4 2xl:block"
      >
        {panel}
      </aside>

      {/* Phones and smaller screens: a small tab that opens the panel. */}
      <div className="2xl:hidden">
        {open ? (
          <div className="fixed inset-0 z-[1200] flex justify-end bg-black/40" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-label="Conveyancing solicitors"
              className="h-full w-[85%] max-w-sm overflow-y-auto bg-zinc-50 p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mb-3 min-h-[40px] border px-3 text-sm font-semibold"
              >
                Close
              </button>
              {panel}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="fixed right-0 bottom-24 z-[1050] border border-r-0 border-zinc-900 bg-white px-3 py-2 text-sm font-semibold shadow-md"
          >
            Conveyancers{place ? ` · ${place}` : ""}
          </button>
        )}
      </div>
    </>
  );
}
