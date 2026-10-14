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
  const aerial = src.includes("/World_Imagery/MapServer/tile/")
  const photo = src.startsWith("https://placehold.co/") ? (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className="h-full w-full object-cover"
    />
  ) : (
    <img src={src} alt={alt} width={width} height={height} className="h-full w-full object-cover" />
  )

  return (
    <span className={`relative block overflow-hidden ${className ?? ""}`}>
      {photo}
      {aerial ? (
        <span className="absolute bottom-1 left-1 bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
          Aerial
        </span>
      ) : null}
    </span>
  )
}
