// On-demand loader, defensive parser and hook for per-place visit details (the places folder named by the manifest).
import { useEffect, useState } from 'react'
import { fetchBoundedJson } from '../../lib/boundedJson'
import { useRelease } from './release'
import {
  VISIT_FIELD_KEYS,
  type PlaceDetails,
  type VisitField,
  type VisitFieldKey,
} from '../../types/data-model'

export const MAX_DETAILS_BYTES = 64 * 1024
const MAX_VALUE_LENGTH = 200
const ID_PATTERN = /^[a-z0-9-]{1,120}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const isValidPlaceId = (id: unknown): id is string =>
  typeof id === 'string' && ID_PATTERN.test(id)

/** `base` is the release's places folder URL (ends with a slash). */
export const placeDetailsUrl = (base: string, id: string) => `${base}${encodeURIComponent(id)}.json`

const KEY_SET = new Set<string>(VISIT_FIELD_KEYS)

/** Parses a details payload; unknown keys are dropped and unsourced "known" fields become unknown. */
export function parsePlaceDetails(raw: unknown, id: string): PlaceDetails | null {
  if (!isRecord(raw) || !Array.isArray(raw.fields)) return null
  const byKey = new Map<VisitFieldKey, VisitField>()
  for (const item of raw.fields) {
    if (!isRecord(item) || typeof item.key !== 'string' || !KEY_SET.has(item.key)) continue
    const key = item.key as VisitFieldKey
    if (byKey.has(key)) continue
    const label = typeof item.label === 'string' && item.label.trim() ? item.label.trim() : key
    const value =
      typeof item.value === 'string' ? item.value.trim().slice(0, MAX_VALUE_LENGTH) : ''
    const sourceId =
      typeof item.sourceId === 'string' && item.sourceId.trim() ? item.sourceId.trim() : ''
    const verifiedAt =
      typeof item.verifiedAt === 'string' && DATE_PATTERN.test(item.verifiedAt)
        ? item.verifiedAt
        : ''
    if (item.status === 'known' && value && sourceId && verifiedAt) {
      byKey.set(key, { key, label, status: 'known', value, sourceId, verifiedAt })
    } else {
      byKey.set(key, { key, label, status: 'unknown' })
    }
  }
  // Fixed order; keys the file omitted are not invented.
  const fields = VISIT_FIELD_KEYS.flatMap((k) => {
    const f = byKey.get(k)
    return f ? [f] : []
  })
  return { id, fields }
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "2026-11-02" -> "Nov 2, 2026" (UTC, so the day never shifts). */
export function formatVerifiedDate(value: string): string {
  if (!DATE_PATTERN.test(value)) return value
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date)
}

export interface SplitFields {
  known: VisitField[]
  /** Unknown fields for the compact "Not verified" line (wheelchair is reported separately). */
  unknown: VisitField[]
  /** True when wheelchair access is not verified; it is always shown explicitly, never inferred. */
  wheelchairUnknown: boolean
}

export function splitFields(fields: VisitField[]): SplitFields {
  const known = fields.filter((f) => f.status === 'known')
  const unknown = fields.filter((f) => f.status !== 'known' && f.key !== 'wheelchair')
  const wheelchairUnknown = !known.some((f) => f.key === 'wheelchair')
  return { known, unknown, wheelchairUnknown }
}

/** Fetches and parses details for one id; resolves null when absent, invalid or failed. Rejects only on abort. */
export async function loadPlaceDetails(
  base: string,
  id: string,
  signal: AbortSignal,
): Promise<PlaceDetails | null> {
  if (!isValidPlaceId(id)) return null
  try {
    const raw = await fetchBoundedJson(placeDetailsUrl(base, id), {
      signal,
      maxBytes: MAX_DETAILS_BYTES,
      label: 'Place details',
      budgetMessage: 'Place details exceed the download budget.',
    })
    return parsePlaceDetails(raw, id)
  } catch (err) {
    if (signal.aborted) throw err
    return null
  }
}

const cache = new Map<string, PlaceDetails | null>()

export interface PlaceDetailsResult {
  status: 'loading' | 'ready' | 'missing'
  details: PlaceDetails | null
}

const MISSING: PlaceDetailsResult = { status: 'missing', details: null }
const LOADING: PlaceDetailsResult = { status: 'loading', details: null }

export function usePlaceDetails(id: string | null): PlaceDetailsResult {
  const release = useRelease()
  const [loaded, setLoaded] = useState<{ id: string; details: PlaceDetails | null } | null>(null)

  useEffect(() => {
    if (!release || !id || !isValidPlaceId(id) || cache.has(id)) return
    const controller = new AbortController()
    loadPlaceDetails(release.placesBaseUrl, id, controller.signal).then(
      (details) => {
        cache.set(id, details)
        setLoaded({ id, details })
      },
      () => {
        // Aborted: nothing to record.
      },
    )
    return () => controller.abort()
  }, [id, release])

  if (!id || !isValidPlaceId(id)) return MISSING
  const entry = cache.has(id) ? { id, details: cache.get(id) ?? null } : loaded?.id === id ? loaded : null
  if (!entry) return LOADING
  return entry.details ? { status: 'ready', details: entry.details } : MISSING
}

/** Test helper: clears the per-id cache. */
export function clearPlaceDetailsCache() {
  cache.clear()
}
