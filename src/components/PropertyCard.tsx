import Link from "next/link"
import { ListingPhoto } from "@/components/listing-photo"
import { MapThumbnail } from "@/components/map-thumbnail"
import { telHref, whatsappHref } from "@/lib/developerContact"
import type { ListingPoint } from "@/lib/mappedProperties"

export default function PropertyCard({ property }: { property: ListingPoint }) {
  return (
    <article className="flex flex-col gap-3 border p-3">
      <Link href={`/property/${property.id}`} className="grid grid-cols-2 gap-2">
        <ListingPhoto
          src={property.image}
          alt={property.title}
          width={800}
          height={800}
          className="aspect-square h-full w-full object-cover"
        />
        <MapThumbnail lat={property.lat} lng={property.lng} label={property.location} />
      </Link>
      <div>
        <p className="text-sm text-zinc-600">{property.kind === "developer" ? "Developer" : "Private sale"}</p>
        <h2 className="text-lg font-semibold">
          <Link href={`/property/${property.id}`}>{property.title}</Link>
        </h2>
        <p>{property.priceLabel}</p>
        <p className="text-sm text-zinc-600">{property.location}</p>
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
