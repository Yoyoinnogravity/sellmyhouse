import Link from "next/link"
import { ListingPhoto } from "@/components/listing-photo"
import { MapThumbnail } from "@/components/map-thumbnail"
import { telHref, whatsappHref } from "@/lib/developerContact"
import type { ListingPoint } from "@/lib/mappedProperties"

export default function PropertyCard({ property }: { property: ListingPoint }) {
  return (
    <article className="flex min-w-0 flex-col gap-3 border p-3">
      <Link href={`/property/${property.id}`} className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        <ListingPhoto
          src={property.image}
          alt={property.title}
          width={800}
          height={800}
          className="aspect-square h-full w-full object-cover"
        />
        <MapThumbnail lat={property.lat} lng={property.lng} label={property.location} />
      </Link>
      <div className="min-w-0">
        <p className="text-sm text-zinc-600">{property.kind === "developer" ? "Developer" : "Private sale"}{property.developerVerified ? " · Verified developer" : ""}</p>
        <h2 className="text-base font-semibold break-words sm:text-lg">
          <Link href={`/property/${property.id}`}>{property.title}</Link>
        </h2>
        <p className="break-words">{property.priceLabel}</p>
        <p className="text-sm break-words text-zinc-600">{property.location}</p>
        {property.phones.length > 0 || property.whatsappNumber || property.website ? (
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {property.phones.map((phone) => (
              <a key={phone} href={telHref(phone)}>
                {phone}
              </a>
            ))}
            {property.whatsappNumber ? (
              <a href={whatsappHref(property.whatsappNumber)}>WhatsApp</a>
            ) : null}
            {property.website ? (
              <a href={property.website} target="_blank" rel="noreferrer">
                Website
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </article>
  )
}
