"use client"

import Link from "next/link"
import { useState } from "react"

const links = [
  { href: "/properties", label: "Properties" },
  { href: "/sell", label: "Sell" },
  { href: "/agents", label: "Agents" },
  { href: "/solicitors", label: "Conveyancers" },
  { href: "/agents/upload", label: "Upload" },
  { href: "/advertise", label: "Advertise" },
  { href: "/dashboard", label: "Dashboard" },
]

export function NavbarMenu({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Link href="/" className="shrink-0 font-semibold tracking-tight whitespace-nowrap">
        {siteName}
      </Link>
      <div className="ml-auto sm:hidden">
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
