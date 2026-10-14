import { randomBytes } from "node:crypto"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  deleteListingPhoto,
  putListingPhoto,
  storageEnabled,
} from "@/lib/objectStorage"

const MAX_PHOTOS = 8
const MAX_BYTES = 4 * 1024 * 1024

export class ListingPhotoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ListingPhotoError"
  }
}

function imageExtension(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return ".jpg"
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return ".png"
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return ".webp"
  }
  return null
}

function contentTypeFor(extension: string) {
  if (extension === ".png") return "image/png"
  if (extension === ".webp") return "image/webp"
  return "image/jpeg"
}

export async function saveListingPhotos(files: Blob[]) {
  const pictures = files.filter((file) => file.size > 0)
  if (pictures.length > MAX_PHOTOS) {
    throw new ListingPhotoError("Add up to 8 pictures.")
  }

  const useBucket = storageEnabled()
  if (!useBucket) {
    await mkdir(path.join(process.cwd(), "data", "uploads"), { recursive: true })
  }
  const urls: string[] = []

  try {
    for (const file of pictures) {
      if (file.size > MAX_BYTES) {
        throw new ListingPhotoError("Each picture must be 4 MB or smaller.")
      }
      const bytes = Buffer.from(await file.arrayBuffer())
      const extension = imageExtension(bytes)
      if (!extension) {
        throw new ListingPhotoError("Pictures must be JPG, PNG, or WebP.")
      }
      const name = `${randomBytes(16).toString("hex")}${extension}`
      if (useBucket) {
        await putListingPhoto(name, bytes, contentTypeFor(extension))
      } else {
        await writeFile(path.join(process.cwd(), "data", "uploads", name), bytes)
      }
      urls.push(`/uploads/${name}`)
    }
  } catch (error) {
    await removeListingPhotos(urls)
    throw error
  }

  return urls
}

export async function removeListingPhotos(urls: string[]) {
  await Promise.all(
    urls.map(async (url) => {
      const name = url.slice("/uploads/".length)
      if (!/^[a-f0-9]{32}\.(jpe?g|png|webp)$/.test(name)) return
      if (storageEnabled()) {
        await deleteListingPhoto(name)
      }
      await unlink(path.join(process.cwd(), "data", "uploads", name)).catch(() => undefined)
    }),
  )
}
