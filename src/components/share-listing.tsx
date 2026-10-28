"use client"

import { useEffect, useState } from "react"

// Lets visitors pass a listing on to friends and family, which is how most
// property enquiries start. Uses the phone's own share sheet where available.
export function ShareListing({ title, location }: { title: string; location: string }) {
  const [url, setUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setUrl(window.location.href)
    setCanShare(typeof navigator.share === "function")
  }, [])

  const text = `${title} in ${location}`
  const linkClass = "inline-flex min-h-[40px] items-center border px-3 text-sm"

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt("Copy this link:", url)
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url })
    } catch {
      // The visitor closed the share sheet.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-zinc-600">Know someone looking?</span>
      {canShare ? (
        <button type="button" onClick={nativeShare} className={linkClass}>
          Share
        </button>
      ) : null}
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        WhatsApp
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Facebook
      </a>
      <button type="button" onClick={copy} className={linkClass}>
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  )
}

// Shown once, right after a seller publishes: their link, ready to send to
// a lawyer, family or buyers. There's no account, so this link is how they
// find the listing again.
export function ListingLive({ title }: { title: string }) {
  const [url, setUrl] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const clean = new URL(window.location.href)
    clean.searchParams.delete("published")
    setUrl(clean.toString())
  }, [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt("Copy this link:", url)
    }
  }

  const button = "inline-flex min-h-[44px] items-center border border-green-700 bg-white px-4 font-semibold"

  return (
    <div className="flex flex-col gap-3 border-2 border-green-700 bg-green-50 p-4" role="status">
      <p className="text-lg font-semibold text-green-900">Your listing is live.</p>
      <p className="text-green-900">
        Send this link to your lawyer, family or anyone who might want to buy. Save it too: it&apos;s how you
        find your listing again.
      </p>
      <p className="break-all border bg-white p-2 font-mono text-sm">{url}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={button}>
          {copied ? "Link copied" : "Copy link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={button}
        >
          Send on WhatsApp
        </a>
        <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`} className={button}>
          Send by email
        </a>
      </div>
    </div>
  )
}
