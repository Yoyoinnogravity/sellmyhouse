import { connection } from "next/server"
import { internetQuery, portalSearchUrl, portalsFor, searchInternet, webSearchUrl } from "@/lib/internetSearch"
import type { ListingSearch } from "@/lib/listingSearch"

// "Across the internet": live web results when a search key is configured,
// and portal searches by country always. Rendered inside Suspense by the
// caller so our own listings stream first.

export async function InternetResults({ search }: { search: ListingSearch }) {
  await connection()
  if (!search.place.trim()) return null
  const [live, groups] = [await searchInternet(search), portalsFor(search.place)]
  const query = internetQuery(search)

  return (
    <section className="flex flex-col gap-4 border-t pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">Across the internet</h2>
        <p className="text-sm text-zinc-600">
          {live.results.length > 0
            ? `What the web has for “${query}”. Each result opens the other site.`
            : `Search the main property portals for “${query}”. Each link opens that portal’s results in a new tab.`}
        </p>
      </div>

      {live.results.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {live.results.map((result) => (
            <li key={result.url} className="flex gap-3 border p-3">
              {result.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.image} alt="" className="h-20 w-28 shrink-0 object-cover" loading="lazy" />
              ) : null}
              <div className="flex min-w-0 flex-col gap-1">
                <a href={result.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold">
                  {result.title}
                </a>
                <span className="text-xs text-zinc-500">{result.host}</span>
                {result.snippet ? <p className="text-sm text-zinc-700">{result.snippet}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.country} className="flex flex-wrap items-center gap-2">
            <span className="w-full text-sm text-zinc-600 sm:w-auto sm:min-w-40">{group.country}</span>
            {group.portals.map((portal) => (
              <a
                key={portal.host}
                href={portalSearchUrl(portal, query)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex min-h-[36px] items-center border px-3 py-1 text-sm"
              >
                {portal.name}
              </a>
            ))}
          </div>
        ))}
        <p className="text-sm">
          <a href={webSearchUrl(query)} target="_blank" rel="noopener noreferrer nofollow" className="underline">
            Search the whole web for “{query}”
          </a>
        </p>
      </div>
    </section>
  )
}
