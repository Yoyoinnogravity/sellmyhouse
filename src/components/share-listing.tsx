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
