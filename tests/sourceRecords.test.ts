import { describe, expect, it } from 'vitest'
import { build } from '../pipeline/scripts/build-catalog.mjs'
import { parsePlaceDetails, parseSourceRecords } from '../src/features/places/placeDetails'
import { validateDetail } from '../pipeline/lib/visit.mjs'

const built = build({ write: false })

describe('source records in the built detail files', () => {
  it('lists the Cary parcels, the merged Wake park and the Wake park entrances on a merged park', () => {
    const d = built.details['cary-park-new-hope-church-road-trailhead-park']
    expect(built.dedupeSkips).toEqual([
      expect.objectContaining({ caryId: 'cary-park-new-hope-church-road-trailhead-park', objectId: 584 }),
    ])
    expect(d.sourceRecords).toContainEqual({ sourceId: 'cary-parks', recordId: '0086958' })
    expect(d.sourceRecords).toContainEqual({ sourceId: 'wake-parks', recordId: '584' })
    expect(d.sourceRecords?.filter((r) => r.sourceId === 'wake-park-entrances').length).toBeGreaterThan(0)
  })
  it('gives every place at least one record, with unique pairs in stable order', () => {
    for (const p of built.catalog.places) {
      const list = built.details[p.id as string].sourceRecords ?? []
      expect(list.length, String(p.id)).toBeGreaterThan(0)
      expect(new Set(list.map((r) => `${r.sourceId}/${r.recordId}`)).size).toBe(list.length)
      expect(list.every((r) => (built.catalog.sources as { id: string }[]).some((s) => s.id === r.sourceId))).toBe(true)
    }
  })
  it('passes the release gate for the detail shape', () => {
    const sources = new Set((built.catalog.sources as { id: string }[]).map((s) => s.id))
    const d = built.details['cary-park-new-hope-church-road-trailhead-park']
    expect(validateDetail(d, d.id, sources)).toEqual([])
    expect(validateDetail({ ...d, sourceRecords: [{ sourceId: 'nope', recordId: '1' }] }, d.id, sources)[0]).toMatch(/not a catalog source/)
    expect(validateDetail({ ...d, sourceRecords: [] }, d.id, sources)[0]).toMatch(/non-empty/)
  })
})

describe('parsing source records in the app', () => {
  const fields = [{ key: 'parking', label: 'Parking', status: 'unknown' }]
  it('keeps well-formed pairs and drops the rest', () => {
    expect(
      parseSourceRecords([
        { sourceId: 'a', recordId: '1' },
        { sourceId: 'a', recordId: '1' },
        { sourceId: 'a', recordId: 2 },
        { sourceId: '', recordId: '3' },
        'x',
      ]),
    ).toEqual([{ sourceId: 'a', recordId: '1' }])
    expect(parseSourceRecords(undefined)).toEqual([])
  })
  it('is tolerant of absence', () => {
    expect(parsePlaceDetails({ fields }, 'p')).toEqual({ id: 'p', fields: [{ key: 'parking', label: 'Parking', status: 'unknown' }] })
    expect(parsePlaceDetails({ fields, sourceRecords: 'bad' }, 'p')?.sourceRecords).toBeUndefined()
    expect(parsePlaceDetails({ fields, sourceRecords: [{ sourceId: 's', recordId: '9' }] }, 'p')?.sourceRecords).toEqual([{ sourceId: 's', recordId: '9' }])
  })
})
