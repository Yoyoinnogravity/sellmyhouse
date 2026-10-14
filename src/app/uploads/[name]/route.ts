import { readFile } from "node:fs/promises"
import path from "node:path"
import { connection } from "next/server"
import { getListingPhoto, storageEnabled } from "@/lib/objectStorage"

export const instant = false

function contentTypeFor(name: string) {
  if (name.endsWith(".png")) return "image/png"
  if (name.endsWith(".webp")) return "image/webp"
  return "image/jpeg"
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  await connection()
  const { name } = await params
  if (!/^[a-f0-9]{32}\.(jpe?g|png|webp)$/.test(name)) {
    return new Response("Not found", { status: 404 })
  }

  if (storageEnabled()) {
    const photo = await getListingPhoto(name)
    if (!photo) {
      return new Response("Not found", { status: 404 })
    }
    return new Response(photo.bytes, {
      headers: {
        "Content-Type": photo.contentType ?? contentTypeFor(name),
        "Cache-Control": "public, max-age=86400",
      },
    })
  }

  try {
    const bytes = await readFile(path.join(process.cwd(), "data", "uploads", name))
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentTypeFor(name),
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
