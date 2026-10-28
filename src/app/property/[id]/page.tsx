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
import { ListingLive, ShareListing } from "@/components/share-listing";
import { SolicitorContacts } from "@/components/solicitor-contacts";
import { conveyancerPlace, listSolicitors } from "@/lib/solicitor";
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
        select: { title: true, price: true, currency: true, location: true, description: true, image: true, images: true },
      }),
    ]);
    if (!listing) return {};
    const price = priceLabel(listing.currency, listing.price);
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

  if (!property) {
    notFound();
  }

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
  const mapPoint = {
    id: property.id,
    title: property.title,
    location: property.location,
    priceLabel: priceLabel(property.currency, property.price),
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

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      {(await searchParams).published ? <ListingLive title={property.title} /> : null}
      <h1 className="text-3xl font-semibold tracking-tight">{property.title}</h1>
      <p>{kind === "developer" ? "Developer unit" : "Private sale"}{property.developerVerified ? " · Verified developer" : ""}</p>
      <p>Buying? No account needed. Contact the seller, realtor, or a conveyancer below.</p>
      <ShareListing title={property.title} location={property.location} />
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
      <p>{property.location}</p>
      <p>{mapPoint.priceLabel}</p>
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
            <p>
              <a href={contact.website} target="_blank" rel="noreferrer">
                {contact.website.replace(/^https?:\/\//, "")}
              </a>
            </p>
          ) : null}
        </section>
      ) : null}
      {property.description ? <p>{property.description}</p> : null}
      {details.length > 0 ? (
        <ul>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {extra ? (
        <ul>
          {Object.entries(extra)
            .filter(([key]) => !["listingKey", "lat", "lng", "register", "priceMin", "priceMax", "phone", "phone2", "website", "contactChecked", "developer", "videos", "mediaChecked", "geoChecked", "contactRole", "realtorAgency", "solicitorName", "solicitorFirm", "solicitorPhone", "solicitorEmail"].includes(key))
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
      ) : property.contactType === "direct" ? (
        <section>
          <h2>{extra?.contactRole === "realtor" ? "Realtor" : "Contact the seller"}</h2>
          <p>{property.contactName}</p>
          {typeof extra?.realtorAgency === "string" ? <p>{extra.realtorAgency}</p> : null}
          <p>{property.contactPhone}</p>
          <p>{property.contactEmail}</p>
        </section>
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
          <p>Selling this property? Sign in to choose an agent.</p>
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
  }
  return labels[key] ?? key
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
