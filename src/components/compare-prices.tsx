"use client";

import { useState } from "react";
import type { CompareBlock } from "@/lib/priceCompare";

const money = (currency: string, value: number) => `${currency ? `${currency} ` : ""}${value.toLocaleString()}`;

// A folded section on each listing. Nothing is fetched until it's opened.
export function ComparePrices({ id }: { id: number }) {
  const [blocks, setBlocks] = useState<CompareBlock[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(open: boolean) {
    if (!open || blocks || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/compare/${id}`);
      const data = (await response.json()) as { blocks?: CompareBlock[] };
      setBlocks(data.blocks ?? []);
    } catch {
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="border" onToggle={(event) => load((event.currentTarget as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer px-4 py-3 font-semibold">Compare prices nearby</summary>
      <div className="flex flex-col gap-5 border-t px-4 py-4">
        {loading || blocks === null ? <p className="text-sm text-zinc-600">Looking up prices…</p> : null}
        {blocks && blocks.length === 0 ? (
          <p className="text-sm text-zinc-600">No price figures for this area yet.</p>
        ) : null}
        {blocks?.map((block) => (
          <section key={block.title} className="flex flex-col gap-2">
            <h3 className="font-semibold">{block.title}</h3>
            <p className="text-sm text-zinc-700">
              {block.median != null ? (
                <>
                  Median <strong>{money(block.currency, block.median)}</strong>.{" "}
                </>
              ) : null}
              {block.summary}
            </p>
            <ul className="divide-y border text-sm">
              {block.rows.map((row, index) => (
                <li key={`${row.label}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2">
                  <span className="min-w-0">
                    {row.href ? (
                      <a href={row.href} className="underline">{row.label}</a>
                    ) : (
                      row.label
                    )}
                    <span className="block text-xs text-zinc-500">{row.detail}</span>
                  </span>
                  <span className="font-semibold whitespace-nowrap">{money(block.currency, row.price)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-zinc-500">
              {block.sourceUrl.startsWith("/") ? (
                block.source
              ) : (
                <a href={block.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{block.source}</a>
              )}
            </p>
          </section>
        ))}
        {blocks && blocks.length > 0 ? (
          <p className="text-xs text-zinc-500">For guidance only. Asking prices and rents are not final prices, and every property differs.</p>
        ) : null}
      </div>
    </details>
  );
}
