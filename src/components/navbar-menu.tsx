"use client"

import Link from "next/link"
import { useState } from "react"

const publicLinks = [
  { href: "/properties?all=1&deal=sale", label: "Buy" },
  { href: "/properties?all=1&deal=rent", label: "Rent" },
  { href: "/sell", label: "Sell" },
  { href: "/listing-format", label: "Database format" },
  { href: "/agents", label: "Agents" },
  { href: "/solicitors", label: "Conveyancers" },
  { href: "/advertise", label: "Advertise" },
  { href: "/developers", label: "Developers" },
]

const adminLinks = [{ href: "/leads", label: "Leads" }]

export function NavbarMenu({ siteName, admin = false }: { siteName: string; admin?: boolean }) {
  const [open, setOpen] = useState(false)
  const links = admin ? [...publicLinks, ...adminLinks] : publicLinks

  return (
    <>
      <Link href="/" className="shrink-0 font-semibold tracking-tight whitespace-nowrap">
        {siteName}
      </Link>
      <div className="ml-auto flex items-center gap-2 sm:hidden">
        <Link href="/sell" className="inline-flex min-h-[40px] items-center whitespace-nowrap bg-zinc-900 px-3 font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-black">
          List free
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center border px-3 text-base"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>
      <div className="hidden items-center gap-x-6 sm:flex sm:flex-1">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="whitespace-nowrap">
            {link.label}
          </Link>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-6">
          <Link href="/sell" className="inline-flex min-h-[40px] items-center whitespace-nowrap bg-zinc-900 px-3 font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-black">
            <span className="hidden lg:inline">List your property free</span>
            <span className="lg:hidden">List free</span>
          </Link>
          <Link href="/login" className="whitespace-nowrap">
            Log in
          </Link>
          <Link href="/register" className="whitespace-nowrap">
            Register
          </Link>
        </div>
      </div>
      {open ? (
        <div className="flex w-full flex-col border-t border-black/10 py-2 sm:hidden dark:border-white/15">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center py-2 text-base"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="flex min-h-[44px] items-center py-2 text-base"
          >
            Log in
          </Link>
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="flex min-h-[44px] items-center py-2 text-base"
          >
            Register
          </Link>
        </div>
      ) : null}
    </>
  )
}
