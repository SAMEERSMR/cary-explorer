// Builds the Fuse.js search index and runs searches with exact name/alias matches ranked first.
import Fuse, { type IFuseOptions } from 'fuse.js'
import type { Place } from '../../types/place'

const fuseOptions: IFuseOptions<Place> = {
  keys: ['name', 'aliases'],
  threshold: 0.3,
  ignoreLocation: true,
}

export function buildSearchIndex(places: Place[]): Fuse<Place> {
  return new Fuse(places, fuseOptions)
}

// Case-insensitive exact matches on name or alias first, then Fuse results, without duplicates.
export function searchPlaces(index: Fuse<Place>, places: Place[], query: string): Place[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const exact = places.filter(
    (p) => p.name.toLowerCase() === q || p.aliases.some((a) => a.toLowerCase() === q),
  )
  const seen = new Set(exact.map((p) => p.id))
  const fuzzy = index
    .search(q)
    .map((r) => r.item)
    .filter((p) => !seen.has(p.id))
  return [...exact, ...fuzzy]
}
