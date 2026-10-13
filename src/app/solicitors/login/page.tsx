"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SolicitorLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/solicitors/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        solicitor?: { id: number };
        error?: string;
      } | null;

      if (!response.ok || !data?.solicitor) {
        setError(data?.error ?? "Could not log in.");
        return;
      }

      router.push(`/solicitors/${data.solicitor.id}`);
    } catch {
      setError("Could not log in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Solicitor log in</h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
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
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6">
        <Link href="/solicitors/register">Register</Link>
      </p>
    </main>
  );
}
