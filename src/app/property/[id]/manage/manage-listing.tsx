"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Listing = { title: string; price: number; location: string; description: string };

// The key lives in the #fragment of the private link, so it never reaches
// a server log or another site.
function keyFromHash() {
  const match = /(?:^|[#&])key=([A-Za-z0-9_-]+)/.exec(window.location.hash);
  return match ? match[1] : "";
}

export default function ManageListing({ id }: { id: number }) {
  const [key, setKey] = useState("");
  const [listing, setListing] = useState<Listing | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "saved" | "removed" | "error">("loading");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function call(body: Record<string, unknown>) {
    const response = await fetch(`/api/properties/${id}/manage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, ...body }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "Something went wrong. Please try again in a minute.");
    return data;
  }

  useEffect(() => {
    const found = keyFromHash();
    setKey(found);
    if (!found) {
      setState("error");
      setMessage("This page needs your private link, the one shown when you published. Open that link exactly as it was given to you.");
      return;
    }
    fetch(`/api/properties/${id}/manage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: found, action: "load" }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error ?? "Your listing couldn't be loaded. Please try again in a minute.");
        setListing(data);
        setState("ready");
      })
      .catch((error: Error) => {
        setState("error");
        setMessage(error.message);
      });
  }, [id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await call({
        action: "update",
        title: form.get("title"),
        price: form.get("price"),
        description: form.get("description"),
      });
      setState("saved");
      setMessage("Saved. Your listing now shows the new details.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage("");
    try {
      await call({ action: "remove" });
      setState("removed");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 block w-full border px-3 py-3 text-base";

  if (state === "loading") return <p>Loading your listing…</p>;
  if (state === "error") {
    return (
      <p role="alert" className="border border-red-300 bg-red-50 p-3 text-red-800">
        {message}
      </p>
    );
  }
  if (state === "removed") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-lg font-semibold">Your listing has been removed.</p>
        <p>It has been taken off the site. The map catches up within a few minutes. Thank you for using Sell My.</p>
        <Link href="/" className="underline">Go to the home page</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="text-zinc-600">
        {listing?.location}. <Link href={`/property/${id}`} className="underline">View your listing</Link>
      </p>
      <form onSubmit={save} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Change the details</h2>
        <label htmlFor="title">
          Title
          <input id="title" name="title" required maxLength={140} defaultValue={listing?.title} className={input} />
        </label>
        <label htmlFor="price">
          Asking price
          <input id="price" name="price" inputMode="numeric" required defaultValue={listing?.price} className={input} />
        </label>
        <label htmlFor="description">
          Description
          <textarea id="description" name="description" rows={5} defaultValue={listing?.description} className={input} />
        </label>
        {message ? (
          <p role="status" className={state === "saved" ? "text-green-800" : "text-red-800"}>
            {message}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className="min-h-[48px] bg-zinc-900 px-6 font-semibold text-white disabled:opacity-60">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>

      <section className="flex flex-col gap-3 border-t pt-6">
        <h2 className="text-lg font-semibold">Sold it, or changed your mind?</h2>
        {confirming ? (
          <div className="flex flex-col gap-3 border border-red-300 bg-red-50 p-4">
            <p>This removes your listing and its photos for good. It can&apos;t be undone.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={remove} disabled={busy} className="min-h-[44px] bg-red-700 px-4 font-semibold text-white">
                {busy ? "Removing…" : "Yes, remove my listing"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="min-h-[44px] border px-4">
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="min-h-[44px] self-start border px-4">
            Remove my listing
          </button>
        )}
      </section>
    </div>
  );
}
