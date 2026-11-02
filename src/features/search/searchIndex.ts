// Pure place search: one Fuse index over the full catalog, exact station numbers, exact-name hits first.
import Fuse from 'fuse.js'
import type { CategoryId, Place, ThemeId } from '../../types/place'

export interface PlaceFilters {
  themes?: readonly ThemeId[]
  categories?: readonly CategoryId[]
  municipality?: string
}

export type PlaceSearch = (query: string, filters?: PlaceFilters, limit?: number) => Place[]

const STATION = /\b(?:fire\s*)?stations?\s*(?:no\.?|#)?\s*(\d+)\b/

const normalise = (text: string) => text.trim().toLocaleLowerCase('en-US')

export function createPlaceSearch(places: readonly Place[]): PlaceSearch {
  const fuse = new Fuse([...places], {
    keys: [{ name: 'name', weight: 2 }, 'aliases', 'municipality'],
    threshold: 0.35,
    ignoreLocation: true,
  })
  const byName = (a: Place, b: Place) => a.name.localeCompare(b.name)

  return (query, filters = {}, limit = 20) => {
    const text = normalise(query)
    const station = text.match(STATION)
    const stationNumber = station ? Number(station[1]) : undefined
    const remainder = station ? text.replace(station[0], ' ').replace(/\s+/g, ' ').trim() : text

    let candidates: Place[]
    if (remainder) {
      const isExact = (p: Place) => [p.name, ...p.aliases].some((n) => normalise(n) === remainder)
      const hits = fuse.search(remainder).map((r) => r.item)
      // Array.prototype.sort is stable, so Fuse score order is kept within each group.
      candidates = [...hits].sort((a, b) => Number(isExact(b)) - Number(isExact(a)))
    } else {
      candidates = [...places].sort(byName)
    }

    const municipality = filters.municipality ? normalise(filters.municipality) : undefined
    // Filter after matching and before limiting so a filter cannot hide good hits.
    return candidates
      .filter(
        (p) =>
          (stationNumber === undefined ||
            (p.category === 'fire-station' && p.stationNumber === stationNumber)) &&
          (!filters.themes || filters.themes.includes(p.theme)) &&
          (!filters.categories || filters.categories.includes(p.category)) &&
          (municipality === undefined || normalise(p.municipality) === municipality),
      )
      .slice(0, Math.max(0, limit))
  }
}
