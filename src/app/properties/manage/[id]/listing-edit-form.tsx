"use client";

import { FormEvent, useState } from "react";

export type EditableListing = {
  id: number;
  title: string;
  price: number;
  location: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  photos: string[];
};

export default function ListingEditForm({ initial }: { initial: EditableListing }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    setPending(true);
    try {
      const response = await fetch(`/api/properties/${initial.id}`, {
        method: "PATCH",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "Could not save these changes.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Could not save these changes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
      <label htmlFor="title">
        Title
        <input id="title" name="title" required defaultValue={initial.title} maxLength={140} className="mt-1 block w-full border px-3 py-2" />
      </label>
      <p className="text-sm text-zinc-600">{initial.location}</p>
      <label htmlFor="price">
        Price (RM)
        <input id="price" name="price" required inputMode="numeric" defaultValue={String(initial.price)} className="mt-1 block w-full border px-3 py-2" />
      </label>
      <label htmlFor="description">
        Description
        <textarea id="description" name="description" defaultValue={initial.description} rows={5} maxLength={2000} className="mt-1 block w-full border px-3 py-2" />
      </label>
      <label htmlFor="contactPhone">
        Contact phone
        <input id="contactPhone" name="contactPhone" type="tel" defaultValue={initial.contactPhone} className="mt-1 block w-full border px-3 py-2" />
      </label>
      <label htmlFor="contactEmail">
        Contact email
        <input id="contactEmail" name="contactEmail" type="email" defaultValue={initial.contactEmail} className="mt-1 block w-full border px-3 py-2" />
      </label>
      <label htmlFor="website">
        Website
        <input id="website" name="website" defaultValue={initial.website} placeholder="https://" className="mt-1 block w-full border px-3 py-2" />
      </label>
      <div className="flex flex-col gap-2">
        <p className="font-semibold">Current photos ({initial.photos.length})</p>
        {initial.photos.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2">
            {initial.photos.map((src) => (
              <li key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="aspect-square h-auto w-full border object-cover" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600">No photos yet — this listing shows a map instead.</p>
        )}
        <label htmlFor="photos">
          Replace with new photos (up to 8, JPG/PNG/WebP, 4 MB each)
          <input id="photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-1 block w-full border px-3 py-2" />
        </label>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {saved ? <p>Saved. The listing shows your changes immediately.</p> : null}
      <button type="submit" disabled={pending} className="border px-4 py-2 font-semibold">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
