// Validated catalog loader: bounded streaming download plus hand-rolled parsing into Place/Source.
import type { CategoryId, Place, Source } from '../../types/place'
import { CATEGORY_THEME } from '../themes/themes'

export const CATALOG_URL = '/data/catalog.json'

export interface Catalog {
  places: Place[]
  sources: Source[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export function publicUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

function parseSource(item: unknown, index: number, ids: Set<string>): Source {
  const fail = (reason: string): never => {
    throw new Error(`Invalid source at index ${index}: ${reason}.`)
  }
  if (!isRecord(item)) return fail('not an object')
  if (!nonEmpty(item.id)) return fail('id must be a non-empty string')
  if (ids.has(item.id)) return fail(`duplicate id "${item.id}"`)
  if (!nonEmpty(item.name)) return fail('name must be a non-empty string')
  if (!publicUrl(item.url)) return fail('url must be an http(s) URL')
  if (item.retrievedAt !== undefined) {
    if (!nonEmpty(item.retrievedAt) || !Number.isFinite(Date.parse(item.retrievedAt))) {
      return fail('retrievedAt must be a parseable date')
    }
  }
  if (item.license !== undefined && !nonEmpty(item.license)) {
    return fail('license must be a non-empty string')
  }
  ids.add(item.id)
  return {
    id: item.id,
    name: item.name,
    url: item.url,
    license: item.license as string | undefined,
    retrievedAt: item.retrievedAt as string | undefined,
  }
}

function parsePlace(
  item: unknown,
  index: number,
  ids: Set<string>,
  sourceIds: Set<string>,
): Place {
  const fail = (reason: string): never => {
    throw new Error(`Invalid place at index ${index}: ${reason}.`)
  }
  if (!isRecord(item)) return fail('not an object')
  if (!nonEmpty(item.id)) return fail('id must be a non-empty string')
  if (ids.has(item.id)) return fail(`duplicate id "${item.id}"`)
  if (!nonEmpty(item.name)) return fail('name must be a non-empty string')
  if (!Array.isArray(item.aliases) || !item.aliases.every(nonEmpty)) {
    return fail('aliases must be an array of non-empty strings')
  }
  if (typeof item.category !== 'string' || !Object.hasOwn(CATEGORY_THEME, item.category)) {
    return fail(`unknown category "${String(item.category)}"`)
  }
  const category = item.category as CategoryId
  if (!nonEmpty(item.municipality)) return fail('municipality must be a non-empty string')
  if (item.county !== undefined && !nonEmpty(item.county)) {
    return fail('county must be a non-empty string')
  }
  if (typeof item.description !== 'string') return fail('description must be a string')

  const c = item.centroid
  if (
    !Array.isArray(c) ||
    c.length !== 2 ||
    !c.every(finite) ||
    Math.abs(c[0]) > 180 ||
    Math.abs(c[1]) > 90
  ) {
    return fail('centroid must be [lon, lat] with finite numbers, |lon| <= 180, |lat| <= 90')
  }

  const b = item.bbox
  if (b !== undefined) {
    if (!Array.isArray(b) || b.length !== 4 || !b.every(finite) || b[0] > b[2] || b[1] > b[3]) {
      return fail('bbox must be [minLon, minLat, maxLon, maxLat] with finite numbers and min <= max')
    }
  }

  if (item.address !== undefined && !nonEmpty(item.address)) {
    return fail('address must be a non-empty string')
  }
  if (
    item.stationNumber !== undefined &&
    (typeof item.stationNumber !== 'number' ||
      !Number.isInteger(item.stationNumber) ||
      item.stationNumber < 1)
  ) {
    return fail('stationNumber must be an integer >= 1')
  }

  if (!Array.isArray(item.sourceIds) || item.sourceIds.length === 0) {
    return fail('sourceIds must be a non-empty array')
  }
  for (const sid of item.sourceIds) {
    if (!nonEmpty(sid)) return fail('sourceIds must contain non-empty strings')
    if (!sourceIds.has(sid)) return fail(`sourceId "${sid}" has no matching source`)
  }

  ids.add(item.id)
  // The output is an explicit allowlist, not an unchecked copy of the upstream fields.
  return {
    id: item.id,
    name: item.name,
    aliases: item.aliases as string[],
    category,
    theme: CATEGORY_THEME[category],
    municipality: item.municipality,
    county: item.county as string | undefined,
    centroid: [c[0], c[1]],
    bbox: b === undefined ? undefined : [b[0], b[1], b[2], b[3]],
    description: item.description,
    address: item.address as string | undefined,
    stationNumber: item.stationNumber as number | undefined,
    sourceIds: item.sourceIds as string[],
  }
}

export function parseCatalog(value: unknown): { places: Place[]; sources: Source[] } {
  if (!isRecord(value)) throw new Error('Catalog must be an object with "sources" and "places".')
  if (!Array.isArray(value.sources)) throw new Error('Catalog "sources" must be an array.')
  if (!Array.isArray(value.places)) throw new Error('Catalog "places" must be an array.')
  const sourceIdSet = new Set<string>()
  const sources = value.sources.map((s: unknown, i) => parseSource(s, i, sourceIdSet))
  const placeIdSet = new Set<string>()
  const places = value.places.map((p: unknown, i) => parsePlace(p, i, placeIdSet, sourceIdSet))
  return { places, sources }
}

/** Bound decoded bytes even when Content-Length is missing or describes compressed data. */
export async function loadCatalog(
  url: string,
  signal: AbortSignal,
  maxBytes = 2_000_000,
): Promise<{ places: Place[]; sources: Source[] }> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`)
  if (!response.body) throw new Error('Catalog response has no body.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxBytes) {
        await reader.cancel()
        throw new Error('Catalog exceeds the download budget; split it into smaller files.')
      }
      text += decoder.decode(value, { stream: true })
    }
    signal.throwIfAborted()
    return parseCatalog(JSON.parse(text + decoder.decode()))
  } finally {
    reader.releaseLock()
  }
}
