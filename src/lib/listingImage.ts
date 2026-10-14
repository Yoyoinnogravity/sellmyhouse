import { aerialPhotoUrl } from "@/lib/mapTiles"

const SELLER_PHOTO = /^\/uploads\/[a-f0-9]{32}\.(jpe?g|png|webp)$/

function httpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function listedPhoto(value: string) {
  return httpUrl(value) || SELLER_PHOTO.test(value)
}

export function listingImages(images: string | null, image: string | null) {
  if (images) {
    try {
      const parsed = JSON.parse(images) as unknown
      if (Array.isArray(parsed)) {
        const urls = parsed.filter((item): item is string => typeof item === "string" && listedPhoto(item))
        if (urls.length > 0) return urls
      }
    } catch {
      // Fall through to the single image column.
    }
  }
  if (image && listedPhoto(image)) return [image]
  return []
}

export function isPlaceholderPhoto(src: string) {
  return src.startsWith("https://placehold.co/")
}

export function isAerialPhoto(src: string) {
  return src.includes("/World_Imagery/MapServer/tile/")
}

export function isSellerPhoto(src: string) {
  return SELLER_PHOTO.test(src)
}

function realPhotos(images: string | null, image: string | null) {
  return listingImages(images, image).filter((src) => !isPlaceholderPhoto(src))
}

export function hasRealPhotos(images: string | null, image: string | null) {
  return realPhotos(images, image).length > 0
}

function photoPoint(point: { lat: number; lng: number; precise: boolean } | null, vary: number) {
  if (!point) return null
  if (point.precise) return point
  const angle = (vary % 12) * (Math.PI / 6)
  const ring = 0.0015 + (vary % 3) * 0.0008
  return {
    lat: point.lat + Math.sin(angle) * ring,
    lng: point.lng + Math.cos(angle) * ring,
  }
}

export function listingGallery(
  title: string,
  images: string | null,
  image: string | null,
  point: { lat: number; lng: number; precise: boolean } | null,
  vary = 0,
) {
  const photos = realPhotos(images, image)
  if (photos.length > 0) return photos
  const placed = photoPoint(point, vary)
  if (placed) return [aerialPhotoUrl(placed.lat, placed.lng)]
  return [placeholderPhoto(title)]
}

export function listingPhoto(
  title: string,
  images: string | null,
  image: string | null,
  point: { lat: number; lng: number; precise: boolean } | null = null,
  vary = 0,
) {
  return listingGallery(title, images, image, point, vary)[0]
}

export function placeholderPhoto(title: string) {
  return `https://placehold.co/1200x800/0f172a/f8fafc/png?text=${encodeURIComponent(title)}`
}

export function priceLabel(currency: string | null, price: number) {
  const amount = price.toLocaleString()
  return currency ? `${currency} ${amount}` : `$${amount}`
}
