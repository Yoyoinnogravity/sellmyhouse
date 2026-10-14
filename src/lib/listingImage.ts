function httpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function listingImages(images: string | null, image: string | null) {
  if (images) {
    try {
      const parsed = JSON.parse(images) as unknown
      if (Array.isArray(parsed)) {
        const urls = parsed.filter((item): item is string => typeof item === "string" && httpUrl(item))
        if (urls.length > 0) return urls
      }
    } catch {
      // Fall through to the single image column.
    }
  }
  if (image && httpUrl(image)) return [image]
  return []
}

export function isPlaceholderPhoto(src: string) {
  return src.startsWith("https://placehold.co/")
}

export function listingPhoto(title: string, images: string | null, image: string | null) {
  return listingImages(images, image)[0] ?? placeholderPhoto(title)
}

export function placeholderPhoto(title: string) {
  return `https://placehold.co/1200x800/0f172a/f8fafc/png?text=${encodeURIComponent(title)}`
}

export function priceLabel(currency: string | null, price: number) {
  const amount = price.toLocaleString()
  return currency ? `${currency} ${amount}` : `$${amount}`
}
