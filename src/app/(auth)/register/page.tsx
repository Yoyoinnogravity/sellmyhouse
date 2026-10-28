"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { safeNext } from "@/lib/safeNext";

export default function RegisterPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const nextPath = safeNext(useSearchParams().get("next"), "/dashboard");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const listing = nextPath.startsWith("/sell");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(data?.error ?? "Could not create an account.");
        return;
      }

      window.location.assign(nextPath);
    } catch {
      setError("Could not create an account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        {listing ? "Create an account to publish" : "Create an account"}
      </h1>
      <p className="mt-3">
        {listing
          ? "After this, you’ll go back to your listing."
          : "Accounts are for developers and anyone managing several listings. Selling one home? You don't need one: press List free at the top."}
      </p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            className="mt-1 block w-full border px-3 py-2"
          />
        </label>
        <label htmlFor="password">
          Password
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="mt-1 block w-full border px-3 py-2"
          />
          <span className="mt-1 block text-sm">At least 8 characters.</span>
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="border px-3 py-3 font-semibold disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6">
        Already have an account? <Link href={loginHref}>Sign in</Link>
      </p>
    </main>
  );
}
