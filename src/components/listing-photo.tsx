import Image from "next/image"

export function ListingPhoto({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
}: {
  src: string
  alt: string
  className?: string
  width: number
  height: number
  priority?: boolean
}) {
  if (src.startsWith("https://placehold.co/")) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={className}
      />
    )
  }

  return <img src={src} alt={alt} width={width} height={height} className={className} />
}
