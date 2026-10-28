import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, unstable_rethrow } from "next/navigation";
import { ListingPhoto } from "@/components/listing-photo";
import { PropertyMap } from "@/components/property-map";
import { listAvailableAgentsInRegion } from "@/lib/agent";
import { isAerialPhoto, isPlaceholderPhoto, isSellerPhoto, listingGallery, listingImages, priceLabel } from "@/lib/listingImage";
import { listingKind } from "@/lib/listingKind";
import { listingVideos } from "@/lib/listingMedia";
import { publishedContact, telHref, whatsappHref } from "@/lib/developerContact";
import { picturePoint, pointForListing } from "@/lib/places";
import { prisma } from "@/lib/prisma";
import { currentSite } from "@/lib/site";
import { conveyancerRegisterPath, propertyRegion, realtorRegisterPath, regionPath } from "@/lib/region";
import { SellerContact } from "@/components/seller-contact";
import { ListingLive, ShareListing } from "@/components/share-listing";
import { SolicitorContacts } from "@/components/solicitor-contacts";
import { conveyancerPlace, listSolicitors } from "@/lib/solicitor";
import { AdPlace } from "@/components/ad-place";
import { AdminTools } from "@/components/admin-tools";
import { ListingQr } from "@/components/listing-qr";
import { isAdminEmail } from "@/lib/developerAccess";
import { isRemoved } from "@/lib/listingRemoval";
import { getUserFromCookie } from "@/lib/session";
import { RentalDetails } from "@/components/rental-details";
import { isRental, perMonth } from "@/lib/rental";
import { ComparePrices } from "@/components/compare-prices";
import { WebsiteCard } from "@/components/website-card";
import { AgentProfileCard } from "./agent-profile-card";

export const instant = false;

// Shared links on WhatsApp and Facebook show the listing's photo, price and place.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const propertyId = Number((await params).id);
  if (!Number.isInteger(propertyId)) return {};
  try {
    const [site, listing] = await Promise.all([
      currentSite(),
      prisma.property.findUnique({
        where: { id: propertyId },
        select: { title: true, price: true, currency: true, location: true, description: true, image: true, images: true, metadata: true },
      }),
    ]);
    if (!listing || isRemoved(listing.metadata)) return { robots: { index: false } };
    const price = perMonth(priceLabel(listing.currency, listing.price), isRental(listing.metadata));
    const photo = listingImages(listing.images, listing.image).find(
      (src) => src.startsWith("/uploads/") || src.startsWith("https://"),
    );
    const description = [`${price} · ${listing.location}.`, listing.description ?? ""].join(" ").trim().slice(0, 200);
    const title = `${listing.title} · ${price}`;
    return {
      metadataBase: new URL(`https://${site.host}`),
      title: `${title} | ${site.name}`,
      description,
      alternates: { canonical: `/property/${propertyId}` },
      openGraph: {
        type: "website",
        siteName: site.name,
        title,
        description,
        url: `/property/${propertyId}`,
        images: photo ? [{ url: photo }] : undefined,
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    return {};
  }
}

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ published?: string | string[] }>;
}) {
  await connection();
  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) {
    notFound();
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      agent: {
        select: {
          name: true,
          agency: true,
          phone: true,
          email: true,
          country: true,
          city: true,
          license: true,
          isAvailable: true,
        },
      },
      lead: { select: { id: true, city: true, status: true } },
    },
  });

  if (!property || isRemoved(property.metadata)) {
    notFound();
  }
  const viewer = await getUserFromCookie();
  const admin = isAdminEmail(viewer?.email);

  const solicitor =
    property.solicitorId == null
      ? null
      : await prisma.solicitor.findUnique({
        where: { id: property.solicitorId },
        select: {
          id: true,
          name: true,
          firm: true,
          phone: true,
          email: true,
          country: true,
          city: true,
          license: true,
        },
      });

  const solicitors = await listSolicitors(property.location);
  const conveyancers = solicitors.slice(0, 24);
  const conveyancerArea = conveyancerPlace(property.location);
  const photos = listingGallery(
    property.title,
    property.images,
    property.image,
    picturePoint(property.location, property.metadata),
    property.id,
  );
  const point = pointForListing(property.location, property.metadata);
  // Street View only for an exact pin; a town-centre guess would show the wrong street.
  const exact = picturePoint(property.location, property.metadata);
  const streetView = exact?.precise
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${exact.lat},${exact.lng}`
    : null;
  const rental = isRental(property.metadata);
  const mapPoint = {
    id: property.id,
    title: property.title,
    location: property.location,
    priceLabel: perMonth(priceLabel(property.currency, property.price), rental),
    lat: point.lat,
    lng: point.lng,
  };
  const details = listingDetails(property);
  const extra = readMetadata(property.metadata);
  const kind = listingKind(property.metadata);
  const contact = publishedContact(property.metadata);
  const videos = listingVideos(property.metadata);
  const region = propertyRegion(property.location);
  const assignedAgent = property.agent;
  const agentIsAvailable = assignedAgent?.isAvailable === true;
  const regionalAgents =
    agentIsAvailable || !region
      ? []
      : await listAvailableAgentsInRegion(region.country, region.city, 6);

  const site = await currentSite();
  const pageUrl = `https://${site.host}/property/${property.id}`;
  const realPhotos = photos.filter((src) => !isPlaceholderPhoto(src) && !isAerialPhoto(src));
  // Structured data so search engines read this as a property listing.
  const structured = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    url: pageUrl,
    datePosted: property.createdAt.toISOString().slice(0, 10),
    description: (property.description ?? `${property.title} in ${property.location}`).slice(0, 500),
    ...(realPhotos.length > 0
      ? { image: realPhotos.slice(0, 5).map((src) => (src.startsWith("/") ? `https://${site.host}${src}` : src)) }
      : {}),
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: property.currency ?? undefined,
      availability: "https://schema.org/InStock",
      businessFunction: rental ? "https://purl.org/goodrelations/v1#LeaseOut" : "https://purl.org/goodrelations/v1#Sell",
    },
    contentLocation: {
      "@type": "Place",
      name: property.location,
      ...(exact?.precise ? { geo: { "@type": "GeoCoordinates", latitude: exact.lat, longitude: exact.lng } } : {}),
    },
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10 sm:py-16">
      <script
        type="application/ld+json"
        // Built from our own fields; "<" is escaped so text can't end the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }}
      />
      <AdPlace place={property.location} />
      {admin ? <AdminTools id={property.id} imported={kind === "developer"} /> : null}
      {(await searchParams).published ? <ListingLive title={property.title} /> : null}
      {(await searchParams).published ? <ListingQr id={property.id} large /> : null}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{property.title}</h1>
        <p className="text-3xl font-bold tracking-tight">{mapPoint.priceLabel}</p>
        <p className="text-zinc-600">
          {property.location} · {rental ? "For rent" : kind === "developer" ? "Developer unit" : "Private sale"}
          {property.developerVerified ? " · Verified developer" : ""}
        </p>
      </div>
      {property.contactType === "direct" && !property.lead ? (
        <SellerContact
          heading={
            extra?.contactRole === "realtor"
              ? `Realtor${typeof extra?.realtorAgency === "string" ? ` · ${extra.realtorAgency}` : ""}`
              : rental
                ? "Contact the owner"
                : "Contact the seller"
          }
          name={property.contactName}
          phone={property.contactPhone}
          email={property.contactEmail}
          title={property.title}
          location={property.location}
          rental={rental}
        />
      ) : null}
      {rental ? <RentalDetails metadata={extra} /> : null}
      <ShareListing title={property.title} location={property.location} />
      <ListingQr id={property.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <ListingPhoto
          src={photos[0]}
          alt={property.title}
          width={1200}
          height={800}
          priority
          className="h-full min-h-56 w-full object-cover sm:min-h-64"
        />
        <PropertyMap points={[mapPoint]} variant="place" />
      </div>
      {photos.length > 1 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.slice(1).map((src) => (
            <li key={src}>
              <ListingPhoto
                src={src}
                alt=""
                width={800}
                height={800}
                className="aspect-square h-auto w-full object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}
      {streetView ? (
        <a
          href={streetView}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-2 self-start border-2 border-zinc-900 px-4 font-semibold hover:bg-zinc-50"
        >
          Open Street View of this spot ↗
        </a>
      ) : null}
      {isPlaceholderPhoto(photos[0]) ? null : (
        <p className="text-sm text-zinc-600">
          {isAerialPhoto(photos[0])
            ? "Aerial view of this listing."
            : isSellerPhoto(photos[0])
              ? "Pictures from the seller."
              : "Pictures from the developer website."}
        </p>
      )}
      {videos.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2>Video</h2>
          {videos.map((video) =>
            video.kind === "file" ? (
              <video key={video.src} src={video.src} controls className="aspect-video w-full bg-black" />
            ) : (
              <iframe
                key={video.src}
                src={video.src}
                title={`${property.title} video`}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ),
          )}
        </section>
      ) : null}
      {contact.developer || contact.phones.length > 0 || contact.website ? (
        <section className="flex flex-col gap-1">
          <h2>Developer</h2>
          {contact.developer ? <p>{contact.developer}</p> : null}
          {contact.phones.map((phone) => (
            <p key={phone}>
              <a href={telHref(phone)}>{phone}</a>
            </p>
          ))}
          {contact.whatsappNumber ? (
            <p>
              <a href={whatsappHref(contact.whatsappNumber)}>WhatsApp</a>
            </p>
          ) : null}
          {contact.website ? (
            <WebsiteCard id={property.id} website={contact.website} label="The developer's website" />
          ) : contact.developer ? (
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${contact.developer} official website`)}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline"
            >
              Find {contact.developer}&apos;s website
            </a>
          ) : null}
        </section>
      ) : null}
      {!contact.website && typeof extra?.listingUrl === "string" && /^https?:\/\//.test(extra.listingUrl) ? (
        <WebsiteCard
          id={property.id}
          website={extra.listingUrl}
          label={typeof extra?.realtorAgency === "string" ? `${extra.realtorAgency}'s website` : "More on the agent's website"}
        />
      ) : null}
      {property.description ? <p>{property.description}</p> : null}
      {details.length > 0 ? (
        <ul>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      <ComparePrices id={property.id} />
      {extra ? (
        <ul>
          {Object.entries(extra)
            .filter(([key]) => !["listingKey", "manageHash", "lat", "lng", "register", "priceMin", "priceMax", "phone", "phone2", "website", "contactChecked", "developer", "videos", "mediaChecked", "geoChecked", "contactRole", "realtorAgency", "solicitorName", "solicitorFirm", "solicitorPhone", "solicitorEmail", "listingUrl", "saleType", "deposit", "furnished", "availableFrom", "minLeaseMonths", "mediaSource", "mediaOptOut", "mediaTries", "websiteFrom"].includes(key))
            .map(([key, value]) => (
            <li key={key}>
              {metadataLabel(key)}: {String(value)}
            </li>
          ))}
        </ul>
      ) : null}
      {property.contactType === "direct" && property.lead ? (
        <section>
          <h2>Seller</h2>
          <p>{property.contactName}</p>
          <p>
            This seller is being matched with a realtor in {property.lead.city}. Buyers: check
            back soon for the realtor&apos;s contact, or{" "}
            <Link href="/agents">find a local agent</Link>{" "}
            now.
          </p>
          <p className="text-sm text-zinc-600">
            Realtor in {property.lead.city}?{" "}
            <Link href="/agents/dashboard">Get this seller&apos;s number</Link>
          </p>
        </section>
      ) : property.contactType === "direct" && extra?.contactRole === "realtor" ? (
null
      ) : agentIsAvailable && assignedAgent ? (
        <section>
          <h2>Realtor</h2>
          <p>{assignedAgent.name}</p>
          <p>{assignedAgent.agency}</p>
          {assignedAgent.city ? <p>{assignedAgent.city}</p> : null}
          <p>{assignedAgent.country}</p>
          {assignedAgent.license ? <p>{assignedAgent.license}</p> : null}
          <p>{assignedAgent.phone}</p>
          <p>{assignedAgent.email}</p>
        </section>
      ) : null}
      {agentIsAvailable || extra?.contactRole === "realtor" ? null : (
        <section className="flex flex-col gap-4">
          <p>
            {assignedAgent
              ? "This agent is not available. Choose another agent below."
              : "This property does not have an agent yet."}
          </p>
          <h2>Available Agents in This Region</h2>
          {regionalAgents.length === 0 ? (
            <p>
              No realtors registered for this region.{" "}
              <Link href={realtorRegisterPath(region)}>Add your details and region</Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-6">
              {regionalAgents.map((agent) => (
                <li key={agent.id}>
                  <AgentProfileCard
                    name={agent.name}
                    agency={agent.agency}
                    city={agent.city}
                    phone={agent.phone}
                    email={agent.email}
                    photo={agentPhoto(agent.name)}
                    chooseHref={`/property/${property.id}/choose?agentId=${agent.id}`}
                    profileHref={agent.city ? regionPath({ country: agent.country, city: agent.city }) : "/agents"}
                  />
                </li>
              ))}
            </ul>
          )}
          <p className="flex gap-4">
            {region ? (
              <Link href={regionPath(region)}>View all agents</Link>
            ) : null}
            <Link href={`/property/${property.id}/represent`}>
              Request representation (agents)
            </Link>
          </p>
        </section>
      )}
      {solicitor ? (
        <section>
          <h2>Solicitor</h2>
          <p>
            <Link href={`/solicitors/${solicitor.id}`}>
              {solicitor.name}
            </Link>
          </p>
          <p>{solicitor.firm}</p>
          {solicitor.city ? <p>{solicitor.city}</p> : null}
          <p>{solicitor.country}</p>
          {solicitor.license ? <p>{solicitor.license}</p> : null}
          <SolicitorContacts phone={solicitor.phone} email={solicitor.email} />
        </section>
      ) : typeof extra?.solicitorName === "string" ? (
        <section>
          <h2>Solicitor</h2>
          <p>{extra.solicitorName}</p>
          {typeof extra.solicitorFirm === "string" ? <p>{extra.solicitorFirm}</p> : null}
          <SolicitorContacts
            phone={typeof extra.solicitorPhone === "string" ? extra.solicitorPhone : ""}
            email={typeof extra.solicitorEmail === "string" ? extra.solicitorEmail : ""}
          />
        </section>
      ) : null}
      <section className="flex flex-col gap-4">
        <h2>Choose a conveyancer</h2>
        <p>
          Use a local conveyancing solicitor for this purchase or sale. Phone
          and email are the firm&apos;s published contact details.
        </p>
        {conveyancers.length === 0 ? (
          <p>
            No conveyancers registered for this region.{" "}
            <Link href={conveyancerRegisterPath(conveyancerArea)}>
              Add your details and region
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-6">
            {conveyancers.map((option) => (
              <li key={option.id}>
                <p>
                  <Link href={`/solicitors/${option.id}`}>{option.name}</Link>
                </p>
                {option.firm !== option.name ? <p>{option.firm}</p> : null}
                <p>{[option.city, option.country].filter(Boolean).join(", ")}</p>
                {option.license ? <p>{option.license}</p> : null}
                <SolicitorContacts phone={option.phone} email={option.email} />
                <p className="flex gap-4">
                  <Link
                    href={`/property/${property.id}/hire?solicitorId=${option.id}`}
                  >
                    Hire solicitor
                  </Link>
                  <Link
                    href={`/property/${property.id}/consult?solicitorId=${option.id}`}
                  >
                    Request consultation
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link
            href={
              conveyancerArea
                ? `/solicitors?place=${encodeURIComponent(conveyancerArea)}`
                : "/solicitors"
            }
          >
            View all conveyancers
            {conveyancerArea ? ` in ${conveyancerArea}` : ""}
          </Link>
        </p>
      </section>
    </main>
  );
}

function metadataLabel(key: string) {
  const labels: Record<string, string> = {
    projectCode: "Project code",
    developer: "Developer",
    status: "Project status",
    unitType: "Unit type",
    units: "Units of this type",
    areaUnit: "Area unit",
    yearBuilt: "Year built",
    address: "Address",
    postcode: "Postcode",
    country: "Country",
    reference: "Reference",
    listingUrl: "More details",
  }
  if (labels[key]) return labels[key]
  // Extra columns from uploaded files: "swimmingPool" → "Swimming pool".
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function agentPhoto(name: string) {
  return `https://placehold.co/320x320/0f172a/f8fafc/png?text=${encodeURIComponent(name)}`;
}

function listingDetails(property: {
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  builtUp: number | null;
  landSize: number | null;
  tenure: string | null;
  metadata: string | null;
}) {
  const areaUnit = readMetadata(property.metadata)?.areaUnit;
  const unit = typeof areaUnit === "string" ? ` ${areaUnit}` : "";
  const details = [
    property.propertyType,
    property.bedrooms == null ? null : `${property.bedrooms} bedrooms`,
    property.bathrooms == null ? null : `${property.bathrooms} bathrooms`,
    property.builtUp == null
      ? null
      : `${property.builtUp.toLocaleString()}${unit} built-up`,
    property.landSize == null
      ? null
      : `${property.landSize.toLocaleString()}${unit} land`,
    property.tenure,
  ];
  return details.filter((detail): detail is string => Boolean(detail));
}

function readMetadata(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
