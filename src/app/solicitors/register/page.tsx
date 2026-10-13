"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SolicitorRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/solicitors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          firm: formData.get("firm"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          country: formData.get("country"),
          city: formData.get("city"),
          license: formData.get("license"),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        solicitor?: { id: number };
        error?: string;
      } | null;

      if (!response.ok || !data?.solicitor) {
        setError(data?.error ?? "Could not register.");
        return;
      }

      router.push(`/solicitors/${data.solicitor.id}`);
    } catch {
      setError("Could not register.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Solicitor registration
      </h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label htmlFor="name">
          Name
          <input id="name" name="name" required className="mt-1 block w-full border px-3 py-2" />
        </label>
        <label htmlFor="firm">
          Firm
          <input id="firm" name="firm" required className="mt-1 block w-full border px-3 py-2" />
        </label>
        <label htmlFor="phone">
          Phone
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="mt-1 block w-full border px-3 py-2"
          />
        </label>
        <label htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 block w-full border px-3 py-2"
          />
        </label>
        <label htmlFor="country">
          Country
          <input
            id="country"
            name="country"
            required
            className="mt-1 block w-full border px-3 py-2"
          />
        </label>
        <label htmlFor="city">
          City
          <input id="city" name="city" className="mt-1 block w-full border px-3 py-2" />
        </label>
        <label htmlFor="license">
          License
          <input id="license" name="license" className="mt-1 block w-full border px-3 py-2" />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? "Registering…" : "Register"}
        </button>
      </form>
      <p className="mt-6">
        <Link href="/solicitors/login">Log in</Link>
      </p>
    </main>
  );
}
