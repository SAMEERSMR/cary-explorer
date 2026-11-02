import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadCatalog, parseCatalog } from '../src/features/places/catalog'

// Synthetic fixtures only. Records are shaped like catalog.json entries, which carry no derived `theme`.
const source = {
  id: 'example-source',
  name: 'Example source',
  url: 'https://example.org/places',
  retrievedAt: '2026-11-02T12:00:00Z',
}

const place = (id: string, name: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name,
  aliases: [],
  category: 'park',
  municipality: 'Example Town',
  centroid: [-78.8, 35.8],
  description: 'Synthetic test record.',
  sourceIds: ['example-source'],
  ...overrides,
})

const catalog = (places: unknown[], sources: unknown[] = [source]) => ({ sources, places })

afterEach(() => vi.unstubAllGlobals())

describe('catalog boundary', () => {
  it('rejects duplicate IDs, impossible latitude, and unsafe source URLs', () => {
    const duplicate = [place('one', 'Example Park'), place('one', 'Example Park Two')]
    expect(() => parseCatalog(catalog(duplicate))).toThrow(/duplicate id "one"/)

    const badLatitude = [place('one', 'Example Park', { centroid: [-78, 200] })]
    expect(() => parseCatalog(catalog(badLatitude))).toThrow(/centroid must be/)

    const unsafeSource = [{ ...source, url: 'javascript:alert(1)' }]
    expect(() => parseCatalog(catalog([place('one', 'Example Park')], unsafeSource))).toThrow(
      /url must be an http\(s\) URL/,
    )
  })

  it('strips unrelated upstream fields', () => {
    const { places } = parseCatalog(
      catalog([place('one', 'Example Park', { last_editor: 'not-for-publication' })]),
    )
    expect(places[0]).not.toHaveProperty('last_editor')
    expect(places[0].theme).toBe('parks-trails')
  })

  it('limits actual bytes even without a Content-Length header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('a'.repeat(50))))
    await expect(
      loadCatalog('/catalog.json', new AbortController().signal, 10),
    ).rejects.toThrow('download budget')
  })

  it('loads a valid catalog and passes cancellation to fetch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(catalog([place('one', 'Example Park')]))))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    const result = await loadCatalog('/catalog.json', controller.signal)
    expect(result.places.map((p) => p.id)).toEqual(['one'])
    expect(result.sources.map((s) => s.id)).toEqual(['example-source'])
    expect(fetchMock).toHaveBeenCalledWith('/catalog.json', { signal: controller.signal })
  })

  it('rejects a place whose sourceId has no matching source', () => {
    const orphan = [place('one', 'Example Park', { sourceIds: ['missing-source'] })]
    expect(() => parseCatalog(catalog(orphan))).toThrow(/no matching source/)
  })
})
