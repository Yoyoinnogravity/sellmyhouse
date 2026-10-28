"use client";

import { useState } from "react";

// Shown only to the admin on a listing page. Two taps to remove: the first
// asks, the second does it. No browser pop-ups.
export function AdminTools({ id, imported }: { id: number; imported: boolean }) {
  const [step, setStep] = useState<"idle" | "confirm" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function remove() {
    setStep("working");
    try {
      const response = await fetch(`/api/admin/properties/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove" }),
      });
      const data = (await response.json().catch(() => null)) as { result?: string; error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Couldn't remove it.");
      setMessage(data?.result === "hidden" ? "Hidden from the site. It won't be imported again." : "Deleted, with its photos.");
      setStep("done");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't remove it.");
      setStep("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-2 border-red-700 bg-red-50 p-3 text-sm print:hidden">
      <span className="font-bold text-red-800">Admin</span>
      {step === "done" ? (
        <span>
          {message} <a href="/properties" className="underline">Back to listings</a>
        </span>
      ) : step === "confirm" ? (
        <>
          <span>{imported ? "Hide this imported development unit?" : "Delete this listing and its photos for good?"}</span>
          <button type="button" onClick={remove} className="min-h-[40px] bg-red-700 px-3 font-semibold text-white">
            Yes, remove it
          </button>
          <button type="button" onClick={() => setStep("idle")} className="min-h-[40px] border px-3">
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={step === "working"}
            onClick={() => setStep("confirm")}
            className="min-h-[40px] border-2 border-red-700 bg-white px-3 font-semibold text-red-800 disabled:opacity-60"
          >
            {step === "working" ? "Removing…" : "Remove this listing"}
          </button>
          {step === "error" ? <span className="text-red-800">{message}</span> : null}
        </>
      )}
    </div>
  );
}
