// Release manifest: the only fixed-name data file. It names the content-hashed files the app may load.
import { useEffect, useState } from 'react'
import { fetchBoundedJson } from '../../lib/boundedJson'

export const MANIFEST_URL = '/data/manifest.json'
const DATA_ROOT = '/data/'
const VERSION_PATTERN = /^[0-9a-f]{8,64}$/
const PATH_PATTERN = /^[a-z0-9][a-z0-9._/-]*$/

export interface Release {
  /** Release version (hex), shown shortened in the sources view. */
  id: string
  generatedFrom?: string
  catalogUrl: string
  relationshipsUrl: string
  /** Folder URL ending in "/"; a place file is this plus `<id>.json`. */
  placesBaseUrl: string
  /** Parsed and kept; nothing loads these yet. */
  layerUrls: Record<string, string>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isSafePath = (value: unknown): value is string =>
  typeof value === 'string' &&
  PATH_PATTERN.test(value) &&
  !value.includes('..') &&
  !value.includes('//')

/** Resolves a manifest-relative path to /data/<path>, or throws naming the field. */
function resolve(value: unknown, field: string, folder = false): string {
  if (!isSafePath(value)) throw new Error(`Manifest ${field} must be a safe relative path.`)
  if (folder && !value.endsWith('/')) throw new Error(`Manifest ${field} must end with "/".`)
  return DATA_ROOT + value
}

export function parseManifest(raw: unknown): Release {
  if (!isRecord(raw)) throw new Error('Manifest must be an object.')
  if (typeof raw.version !== 'string' || !VERSION_PATTERN.test(raw.version)) {
    throw new Error('Manifest version must be 8 to 64 lowercase hex characters.')
  }
  const artifacts = raw.artifacts
  if (!isRecord(artifacts)) throw new Error('Manifest "artifacts" must be an object.')
  const catalogUrl = resolve(artifacts.catalog, 'artifacts.catalog')
  const relationshipsUrl = resolve(artifacts.relationships, 'artifacts.relationships')
  const placesBaseUrl = resolve(artifacts.places, 'artifacts.places', true)
  const layerUrls: Record<string, string> = {}
  if (artifacts.layers !== undefined) {
    if (!isRecord(artifacts.layers)) throw new Error('Manifest "artifacts.layers" must be an object.')
    for (const [name, path] of Object.entries(artifacts.layers)) {
      layerUrls[name] = resolve(path, `artifacts.layers.${name}`)
    }
  }
  const generatedFrom =
    typeof raw.generatedFrom === 'string' && Number.isFinite(Date.parse(raw.generatedFrom))
      ? raw.generatedFrom
      : undefined
  return { id: raw.version, generatedFrom, catalogUrl, relationshipsUrl, placesBaseUrl, layerUrls }
}

export async function loadManifest(
  url: string,
  signal: AbortSignal,
  maxBytes = 16 * 1024,
): Promise<Release> {
  return parseManifest(
    await fetchBoundedJson(url, {
      signal,
      maxBytes,
      cache: 'no-cache',
      label: 'Manifest',
      budgetMessage: 'Manifest exceeds the download budget.',
    }),
  )
}

let shared: Promise<Release> | null = null

/** One manifest fetch per page. A failure clears the promise so the next call fetches again. */
export function getRelease(): Promise<Release> {
  shared ??= loadManifest(MANIFEST_URL, new AbortController().signal).catch((err: unknown) => {
    shared = null
    throw err
  })
  return shared
}

/** Test helper: forgets the shared release. */
export function resetRelease() {
  shared = null
}

const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** First 8 characters of the id plus the generated date ("Nov 7, 2026", UTC), when there is one. */
export function releaseSummary(release: Release): { shortId: string; date?: string } {
  const parsed = release.generatedFrom ? new Date(release.generatedFrom) : null
  const date = parsed && !Number.isNaN(parsed.getTime()) ? shortDate.format(parsed) : undefined
  return { shortId: release.id.slice(0, 8), date }
}

/** The loaded release, or null while loading or if the manifest failed. */
export function useRelease(): Release | null {
  const [release, setRelease] = useState<Release | null>(null)
  useEffect(() => {
    let live = true
    getRelease().then(
      (r) => live && setRelease(r),
      () => {
        // The catalog surfaces manifest errors; consumers here just see no release.
      },
    )
    return () => {
      live = false
    }
  }, [])
  return release
}
