// Loader and pure helpers for place-to-place relationships (public/data/relationships.json).
import { useEffect, useState } from 'react'
import type { Relationship } from '../../types/data-model'
import type { Place } from '../../types/place'

export const RELATIONSHIPS_URL = '/data/relationships.json'
const MAX_BYTES = 1_000_000
const KINDS = ['contained', 'nearby', 'curated'] as const
const METRES_PER_MILE = 1609.344

export type RelationshipIndex = Map<string, Relationship[]>

export interface Connection {
  place: Place
  label: string
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

/** Keeps well-formed records only; anything malformed or of an unknown kind is dropped. */
export function parseRelationships(payload: unknown): Relationship[] {
  if (!isRecord(payload) || !Array.isArray(payload.relationships)) return []
  const out: Relationship[] = []
  for (const item of payload.relationships) {
    if (!isRecord(item)) continue
    const { from, to, kind, distanceM, basis } = item
    if (!nonEmpty(from) || !nonEmpty(to) || from === to) continue
    if (typeof kind !== 'string' || !(KINDS as readonly string[]).includes(kind)) continue
    const rel: Relationship = { from, to, kind: kind as Relationship['kind'] }
    if (typeof distanceM === 'number' && Number.isFinite(distanceM) && distanceM >= 0) {
      rel.distanceM = distanceM
    }
    if (basis === 'within-400m' || basis === 'nearest') rel.basis = basis
    out.push(rel)
  }
  return out
}

/** Indexes each relationship under both of its place ids. */
export function indexRelationships(rels: Relationship[]): RelationshipIndex {
  const index: RelationshipIndex = new Map()
  for (const rel of rels) {
    for (const id of [rel.from, rel.to]) {
      const list = index.get(id)
      if (list) list.push(rel)
      else index.set(id, [rel])
    }
  }
  return index
}

export async function loadRelationships(
  url: string,
  signal: AbortSignal,
  maxBytes = MAX_BYTES,
): Promise<RelationshipIndex> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Relationships request failed (${response.status}).`)
  if (!response.body) throw new Error('Relationships response has no body.')
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
        throw new Error('Relationships exceed the download budget.')
      }
      text += decoder.decode(value, { stream: true })
    }
    signal.throwIfAborted()
    return indexRelationships(parseRelationships(JSON.parse(text + decoder.decode())))
  } finally {
    reader.releaseLock()
  }
}

function formatMiles(distanceM: number): string {
  const miles = Math.max(0.1, Math.round((distanceM / METRES_PER_MILE) * 10) / 10)
  return `${miles.toFixed(1)} mi`
}

function labelFor(rel: Relationship, placeId: string, other: Place): string {
  if (rel.kind === 'contained') {
    return rel.from === placeId ? `Runs through ${other.name}` : `${other.name} runs through this park`
  }
  if (rel.kind === 'curated') return 'Connected (curated)'
  const away =
    rel.distanceM === undefined ? 'Nearby (straight line)' : `About ${formatMiles(rel.distanceM)} away (straight line)`
  return rel.basis === 'nearest' ? `Closest place: ${away}` : away
}

const KIND_ORDER: Record<Relationship['kind'], number> = { contained: 0, curated: 1, nearby: 2 }

/** Up to `limit` connected places ordered contained, curated, then nearby (closest first). */
function sameNameKey(name: string | undefined): string {
  return (name ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function connectionsFor(
  placeId: string,
  index: RelationshipIndex,
  placesById: ReadonlyMap<string, Place>,
  limit = 3,
): Connection[] {
  const sorted = [...(index.get(placeId) ?? [])].sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity),
  )
  const seen = new Set<string>()
  const out: Connection[] = []
  // A place with the same name is the same real thing in another dataset (e.g. Cary's "Black Creek
  // Greenway" trail and its park area), so linking to it teaches nothing; skip it.
  const ownName = sameNameKey(placesById.get(placeId)?.name)
  for (const rel of sorted) {
    const otherId = rel.from === placeId ? rel.to : rel.from
    const other = placesById.get(otherId)
    if (!other || seen.has(otherId)) continue
    if (ownName && sameNameKey(other.name) === ownName) continue
    seen.add(otherId)
    out.push({ place: other, label: labelFor(rel, placeId, other) })
    if (out.length >= limit) break
  }
  return out
}

let shared: Promise<RelationshipIndex> | null = null

/** Loads once per page; a failure yields an empty index (the card section just hides). */
export function useRelationships(): RelationshipIndex | null {
  const [index, setIndex] = useState<RelationshipIndex | null>(null)
  useEffect(() => {
    let live = true
    shared ??= loadRelationships(RELATIONSHIPS_URL, new AbortController().signal).catch(() => {
      shared = null
      return new Map() as RelationshipIndex
    })
    void shared.then((i) => live && setIndex(i))
    return () => {
      live = false
    }
  }, [])
  return index
}
