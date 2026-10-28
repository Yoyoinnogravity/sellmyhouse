"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ListingDefaults = {
  title: string;
  price: string;
  location: string;
};

export default function SellForm({ defaults }: { defaults: ListingDefaults }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const price = String(formData.get("price") ?? "").trim();
    const location = String(formData.get("location") ?? "").trim();
    const priceNumber = Number(price);

    if (!title || !location || !Number.isInteger(priceNumber) || priceNumber <= 0) {
      setError("Enter a title, location, and a whole-number price.");
      return;
    }

    const params = new URLSearchParams({ title, price, location });
    router.push(`/sell/publish?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
      <label htmlFor="title">
        Title
        <input
          id="title"
          name="title"
          required
          defaultValue={defaults.title}
          className="mt-1 block w-full border px-3 py-2"
        />
      </label>
      <label htmlFor="price">
        Price
        <input
          id="price"
          name="price"
          type="number"
          min={1}
          step={1}
          required
          defaultValue={defaults.price}
          className="mt-1 block w-full border px-3 py-2"
        />
      </label>
      <label htmlFor="location">
        Location
        <input
          id="location"
          name="location"
          required
          defaultValue={defaults.location}
          className="mt-1 block w-full border px-3 py-2"
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" className="border px-4 py-2 font-semibold">Continue to realtor and conveyancer options</button>
    </form>
  );
}
