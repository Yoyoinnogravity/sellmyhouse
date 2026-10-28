"use client";

import { ChangeEvent, FormEvent, useState } from "react";

type Uploaded = { id: number; title: string; manageKey: string };
type Result = { count: number; listings: Uploaded[] };

export default function UploadFile() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    setErrors([]);
    setFileName(event.target.files?.[0]?.name ?? null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setErrors(["Please choose your filled-in template first."]);
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/agents/upload", { method: "POST", body: formData });
      const data = (await response.json().catch(() => null)) as {
        count?: number;
        listings?: Uploaded[];
        error?: string;
        errors?: { message: string }[];
      } | null;
      if (!response.ok || !data?.count || !data.listings) {
        setErrors(
          data?.errors?.length
            ? data.errors.map((error) => error.message)
            : [data?.error ?? "The file couldn't be uploaded just now. Please try again in a minute."],
        );
        return;
      }
      setResult({ count: data.count, listings: data.listings });
      setFileName(null);
      setFormKey((key) => key + 1);
    } catch {
      setErrors(["The file couldn't be uploaded just now. Please try again in a minute."]);
    } finally {
      setPending(false);
    }
  }

  function downloadLinks() {
    if (!result) return;
    const origin = window.location.origin;
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [
      "id,title,public_link,private_check_or_edit_link",
      ...result.listings.map((listing) =>
        [
          listing.id,
          quote(listing.title),
          `${origin}/property/${listing.id}`,
          `${origin}/edit/${listing.id}/${listing.manageKey}`,
        ].join(","),
      ),
    ];
    const blob = new Blob([`﻿${lines.join("\n")}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-listing-links.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (result) {
    return (
      <section className="flex flex-col gap-4 border-2 border-green-600 bg-green-50 p-5 text-zinc-900" aria-live="polite">
        <h2 className="text-xl font-semibold">
          {result.count} {result.count === 1 ? "listing is" : "listings are"} live
        </h2>
        <p>
          Save your private edit links now. They are the only way to change a price or remove a listing later, and
          we can&apos;t show them again.
        </p>
        <button
          type="button"
          onClick={downloadLinks}
          className="min-h-[52px] bg-green-700 px-5 text-base font-semibold text-white hover:bg-green-800 sm:self-start"
        >
          Download my links (spreadsheet)
        </button>
        <ul className="flex max-h-80 flex-col divide-y overflow-y-auto border bg-white">
          {result.listings.map((listing) => (
            <li key={listing.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <a href={`/property/${listing.id}`} className="font-semibold underline">
                {listing.title}
              </a>
              <a href={`/edit/${listing.id}/${listing.manageKey}`} className="text-sm underline">
                Edit (private)
              </a>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setResult(null)} className="text-left underline">
          Upload another file
        </button>
      </section>
    );
  }

  return (
    <form key={formKey} onSubmit={onSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-10000px", width: 1, height: 1 }}
      />
      <label
        htmlFor="file"
        className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed border-zinc-400 p-6 text-center hover:border-zinc-700"
      >
        <span className="text-lg font-semibold">{fileName ?? "Click or tap to choose your file"}</span>
        <span className="text-sm text-zinc-600">Excel (.xlsx), CSV or JSON · up to 200 listings</span>
        <input
          id="file"
          name="file"
          type="file"
          accept=".xlsx,.csv,.txt,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json"
          onChange={onFile}
          className="sr-only"
        />
      </label>
      {errors.length > 0 ? (
        <div role="alert" className="flex flex-col gap-1 border border-red-300 bg-red-50 p-3 text-red-800">
          <p className="font-semibold">Please fix these and upload again:</p>
          <ul className="list-disc pl-5">
            {errors.slice(0, 15).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          {errors.length > 15 ? <p>…and {errors.length - 15} more.</p> : null}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-[52px] bg-zinc-900 px-6 text-lg font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload and publish"}
      </button>
    </form>
  );
}
