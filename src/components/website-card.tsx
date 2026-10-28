"use client";

import { useEffect, useState } from "react";

type Preview = { website: string; host: string; title: string | null; image: string | null } | null;

// A link card to the developer's or agency's own website, with the preview
// picture that site publishes for sharing.
export function WebsiteCard({ id, website, label }: { id: number; website: string; label: string }) {
  const [preview, setPreview] = useState<Preview>(null);
  const [imageOk, setImageOk] = useState(true);

  useEffect(() => {
    let live = true;
    fetch(`/api/site-preview/${id}`)
      .then((response) => response.json())
      .then((data: Preview) => {
        if (live) setPreview(data);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [id]);

  const host = preview?.host ?? website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  return (
    <a
      href={website}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex flex-col overflow-hidden border-2 border-zinc-900 hover:bg-zinc-50 sm:flex-row"
    >
      {preview?.image && imageOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImageOk(false)}
          className="aspect-[1200/630] w-full object-cover sm:w-56"
        />
      ) : null}
      <span className="flex flex-1 flex-col justify-center gap-1 p-4">
        <span className="text-lg font-semibold">{label}</span>
        <span className="text-sm text-zinc-600">{preview?.title ? `${preview.title} · ` : ""}{host}</span>
        <span className="text-sm font-semibold underline">Visit website ↗</span>
      </span>
    </a>
  );
}
