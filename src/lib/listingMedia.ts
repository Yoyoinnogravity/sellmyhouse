export type ListingVideo = {
  src: string
  kind: "youtube" | "vimeo" | "file"
}

function youtube(id: string): ListingVideo | null {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null
  return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` }
}

function vimeo(id: string): ListingVideo | null {
  if (!/^\d{6,12}$/.test(id)) return null
  return { kind: "vimeo", src: `https://player.vimeo.com/video/${id}` }
}

export function videoEmbed(value: string): ListingVideo | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null
  const host = url.hostname.replace(/^www\./, "")

  if (host === "youtu.be") return youtube(url.pathname.split("/").filter(Boolean)[0] ?? "")
  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
    const fromQuery = url.searchParams.get("v")
    const parts = url.pathname.split("/").filter(Boolean)
    const fromPath = parts[0] === "embed" || parts[0] === "shorts" ? parts[1] : ""
    return youtube(fromQuery || fromPath || "")
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    return vimeo(url.pathname.split("/").filter(Boolean).pop() ?? "")
  }
  if (/\.(mp4|webm)$/i.test(url.pathname)) {
    return { kind: "file", src: url.toString() }
  }
  return null
}

export function listingVideos(metadata: string | null): ListingVideo[] {
  if (!metadata) return []
  try {
    const parsed = JSON.parse(metadata) as { videos?: unknown }
    if (!Array.isArray(parsed.videos)) return []
    const videos: ListingVideo[] = []
    for (const value of parsed.videos) {
      if (typeof value !== "string") continue
      const video = videoEmbed(value)
      if (!video || videos.some((item) => item.src === video.src)) continue
      videos.push(video)
      if (videos.length === 3) break
    }
    return videos
  } catch {
    return []
  }
}
