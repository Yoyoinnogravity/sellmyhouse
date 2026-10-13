import type { Property } from "@/types/property";

type PropertyCardProps = {
  property: Property;
};

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <article className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <h2 className="text-lg font-semibold">{property.title}</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {property.location}
      </p>
      <p className="mt-2 font-medium">${property.price.toLocaleString()}</p>
    </article>
  );
}
