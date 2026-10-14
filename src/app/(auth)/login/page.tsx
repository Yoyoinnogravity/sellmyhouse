"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { loginPrompt, safeNext } from "@/lib/safeNext";

export default function LoginPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const nextPath = safeNext(useSearchParams().get("next"), "/dashboard");
  const prompt = loginPrompt(nextPath);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const registerHref = `/register?next=${encodeURIComponent(nextPath)}`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
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
        setError(data?.error ?? "Could not log in.");
        return;
      }

      window.location.assign(nextPath);
    } catch {
      setError("Could not log in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{prompt.title}</h1>
      <p className="mt-3">{prompt.body}</p>
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
            autoComplete="current-password"
            minLength={8}
            required
            className="mt-1 block w-full border px-3 py-2"
          />
          <span className="mt-1 block text-sm">At least 8 characters.</span>
        </label>
        {error ? (
          <p role="alert">
            {error}{" "}
            <Link href={registerHref}>Create an account</Link>
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="border px-3 py-3 font-semibold disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6">
        New here? <Link href={registerHref}>Create an account</Link>
      </p>
      <p className="mt-3">
        <Link href="/properties">Keep browsing homes</Link>
      </p>
    </main>
  );
}
