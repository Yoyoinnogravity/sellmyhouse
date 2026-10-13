"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { APLS } from "@/lib/propertyStandard";

type UploadMode = "json" | "csv" | "manual" | "bulk";

type ListingRow = {
  title: string;
  price: string;
  location: string;
};

type UploadResult = {
  agentName: string;
  count: number;
  ids: number[];
};

const emptyRow = (): ListingRow => ({ title: "", price: "", location: "" });

export default function UploadForm() {
  const router = useRouter();
  const [mode, setMode] = useState<UploadMode>("json");
  const [rows, setRows] = useState<ListingRow[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [pending, setPending] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    formData.set("mode", mode);

    if (mode === "manual") {
      formData.set("source", "manual");
      formData.set(
        "properties",
        JSON.stringify(
          rows.map((row) => ({
            title: row.title,
            price: Number(row.price),
            location: row.location,
            contactType: "agent",
          })),
        ),
      );
    }

    try {
      const response = await fetch("/api/agents/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as {
        agentName?: string;
        count?: number;
        ids?: number[];
        error?: string;
      } | null;

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || !data?.count || !data.ids) {
        setError(data?.error ?? "The listings could not be saved.");
        return;
      }

      setResult({
        agentName: data.agentName ?? "this agent",
        count: data.count,
        ids: data.ids,
      });
      setRows([emptyRow()]);
      setFormKey((key) => key + 1);
    } catch {
      setError("The listings could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <p className="mt-4">
        JSON and CSV uploads need title, price, and location. Include the agent
        name, agency, phone, email, and country on the form or in the file. A
        bulk upload contains {APLS.bulkMin} to {APLS.bulkMax} listings.
      </p>
      {result ? (
        <p className="mt-4">
          Uploaded {result.count} {result.count === 1 ? "listing" : "listings"}{" "}
          for {result.agentName}.{" "}
          {result.ids[0] ? (
            <Link href={`/property/${result.ids[0]}`}>
              View the first listing
            </Link>
          ) : null}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4" role="alert">
          {error}
        </p>
      ) : null}
      <form key={formKey} onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend>How are you adding listings?</legend>
          <label>
            <input
              type="radio"
              name="uploadMode"
              value="json"
              checked={mode === "json"}
              onChange={() => setMode("json")}
            />{" "}
            JSON upload
          </label>
          <label>
            <input
              type="radio"
              name="uploadMode"
              value="csv"
              checked={mode === "csv"}
              onChange={() => setMode("csv")}
            />{" "}
            CSV upload
          </label>
          <label>
            <input
              type="radio"
              name="uploadMode"
              value="manual"
              checked={mode === "manual"}
              onChange={() => setMode("manual")}
            />{" "}
            Manual entry
          </label>
          <label>
            <input
              type="radio"
              name="uploadMode"
              value="bulk"
              checked={mode === "bulk"}
              onChange={() => setMode("bulk")}
            />{" "}
            Bulk upload ({APLS.bulkMin}–{APLS.bulkMax})
          </label>
        </fieldset>

        <label htmlFor="name">
          Agent name
          <input
            id="name"
            name="name"
            required={mode === "manual"}
            className="mt-1 block w-full border px-3 py-2"
          />
        </label>
        <label htmlFor="agency">
          Agency
          <input
            id="agency"
            name="agency"
            required={mode === "manual"}
            className="mt-1 block w-full border px-3 py-2"
          />
        </label>
        <label htmlFor="phone">
          Phone
          <input
            id="phone"
            name="phone"
            type="tel"
            required={mode === "manual"}
            className="mt-1 block w-full border px-3 py-2"
          />
        </label>
        <label htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            required={mode === "manual"}
            className="mt-1 block w-full border px-3 py-2"
          />
        </label>
        <label htmlFor="country">
          Country
          <input
            id="country"
            name="country"
            required={mode === "manual"}
            className="mt-1 block w-full border px-3 py-2"
          />
        </label>

        {mode === "manual" ? (
          <input type="hidden" name="source" value="manual" />
        ) : (
          <label htmlFor="source">
            Source
            <select
              id="source"
              name="source"
              defaultValue="imported"
              className="mt-1 block w-full border px-3 py-2"
            >
              <option value="imported">Imported</option>
              <option value="agency">Agency</option>
            </select>
          </label>
        )}

        {mode === "manual" ? (
          <div className="flex flex-col gap-4">
            {rows.map((row, index) => (
              <fieldset key={index} className="flex flex-col gap-4">
                <legend>Listing {index + 1}</legend>
                <label htmlFor={`title-${index}`}>
                  Title
                  <input
                    id={`title-${index}`}
                    required
                    value={row.title}
                    onChange={(event) => updateRow(index, "title", event.target.value)}
                    className="mt-1 block w-full border px-3 py-2"
                  />
                </label>
                <label htmlFor={`price-${index}`}>
                  Price
                  <input
                    id={`price-${index}`}
                    type="number"
                    min={APLS.priceMin}
                    max={APLS.priceMax}
                    step={1}
                    required
                    value={row.price}
                    onChange={(event) => updateRow(index, "price", event.target.value)}
                    className="mt-1 block w-full border px-3 py-2"
                  />
                </label>
                <label htmlFor={`location-${index}`}>
                  Location
                  <input
                    id={`location-${index}`}
                    required
                    value={row.location}
                    onChange={(event) =>
                      updateRow(index, "location", event.target.value)
                    }
                    className="mt-1 block w-full border px-3 py-2"
                  />
                </label>
                {rows.length > 1 ? (
                  <button type="button" onClick={() => removeRow(index)}>
                    Remove listing
                  </button>
                ) : null}
              </fieldset>
            ))}
            {rows.length < APLS.batchMax ? (
              <button
                type="button"
                onClick={() => setRows((current) => [...current, emptyRow()])}
              >
                Add listing
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <label htmlFor="file">
              {mode === "json"
                ? "JSON file"
                : mode === "csv"
                  ? "CSV file"
                  : "JSON or CSV file"}
              <input
                id="file"
                name="file"
                type="file"
                accept={mode === "csv" ? ".csv,text/csv" : mode === "json" ? ".json,application/json" : ".json,.csv,application/json,text/csv"}
                className="mt-1 block w-full"
              />
            </label>
            <label htmlFor="payload">
              Or paste {mode === "csv" ? "CSV" : mode === "json" ? "JSON" : "JSON or CSV"}
              <textarea
                id="payload"
                name="payload"
                rows={8}
                className="mt-1 block w-full border px-3 py-2"
              />
            </label>
          </>
        )}

        <button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </button>
      </form>
    </>
  );

  function updateRow(index: number, field: keyof ListingRow, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }
}
