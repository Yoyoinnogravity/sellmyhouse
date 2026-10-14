"use client";

import { FormEvent, useState } from "react";

type SearchItem = {
  id: number;
  title: string;
  price: number;
  location: string;
};

export default function DeveloperClaimForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const value = query.trim();
    if (value.length < 2) {
      setError("Type at least 2 characters of the project name.");
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/properties?search=${encodeURIComponent(value)}`);
      const data = (await response.json().catch(() => null)) as { items?: SearchItem[]; error?: string } | null;
      if (!response.ok || !data) {
        setError(data?.error ?? "The search could not run.");
        return;
      }
      setResults(data.items ?? []);
      if ((data.items ?? []).length === 0) {
        setError("No unclaimed developments match that name.");
      }
    } catch {
      setError("The search could not run.");
    } finally {
      setSearching(false);
    }
  }

  function toggle(id: number) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (selected.length === 0) {
      setError("Tick at least one listing.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    setPending(true);
    try {
      const response = await fetch("/api/developer-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: formData.get("company"),
          contactEmail: formData.get("contactEmail"),
          contactPhone: formData.get("contactPhone"),
          listingIds: selected,
        }),
      });
      const data = (await response.json().catch(() => null)) as { id?: number; error?: string } | null;
      if (!response.ok || !data?.id) {
        setError(data?.error ?? "Could not send this request.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not send this request.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return <p>Request received. We verify every developer before handing over edit access, then notify you by email.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={search} className="flex max-w-xl flex-col gap-4">
        <label htmlFor="project-search">
          Find your development
          <span className="mt-1 flex gap-2">
            <input
              id="project-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. Taman Pulai Indah"
              className="block w-full border px-3 py-2"
            />
            <button type="submit" disabled={searching} className="shrink-0 border px-4 py-2 font-semibold">
              {searching ? "Searching…" : "Search"}
            </button>
          </span>
        </label>
      </form>

      {results.length > 0 ? (
        <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="font-semibold">Tick every listing that is yours ({selected.length} chosen)</legend>
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto border p-3">
              {results.map((item) => (
                <li key={item.id}>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} className="mt-1" />
                    <span>
                      <strong>{item.title}</strong>
                      <br />
                      {item.location}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <label htmlFor="company">
            Company name
            <input id="company" name="company" required autoComplete="organization" className="mt-1 block w-full border px-3 py-2" />
          </label>
          <label htmlFor="contactEmail">
            Work email
            <input id="contactEmail" name="contactEmail" type="email" autoComplete="email" className="mt-1 block w-full border px-3 py-2" />
          </label>
          <label htmlFor="contactPhone">
            Contact phone
            <input id="contactPhone" name="contactPhone" type="tel" autoComplete="tel" className="mt-1 block w-full border px-3 py-2" />
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit" disabled={pending} className="border px-4 py-2 font-semibold">
            {pending ? "Sending…" : "Request edit access"}
          </button>
        </form>
      ) : (
        error ? <p role="alert">{error}</p> : null
      )}
    </div>
  );
}
