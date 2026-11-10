import { describe, expect, it } from 'vitest'
import { fireStationDescription, fireStationName, groupFireStations } from '../pipeline/scripts/build-catalog.mjs'
import { validateRegistry } from '../pipeline/lib/snapshot-core.mjs'
import { buildVisitFields } from '../pipeline/lib/visit.mjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { builtCatalog } from './helpers/builtCatalog'

type Pt = [number, number]
const feat = (props: Record<string, unknown>, pt: Pt | null = [-78.75, 35.77]) => ({
  properties: props,
  geometry: pt ? { type: 'Point', coordinates: pt } : null,
})

describe('fireStationName', () => {
  it('turns "<prefix> #N" into "<prefix> Fire Station N" with that number', () => {
    expect(fireStationName('Cary #9')).toEqual({ name: 'Cary Fire Station 9', stationNumber: 9 })
    expect(fireStationName('Durham Highway #2')).toEqual({ name: 'Durham Highway Fire Station 2', stationNumber: 2 })
    expect(fireStationName('Fuquay-Varina  #04')).toEqual({ name: 'Fuquay-Varina Fire Station 4', stationNumber: 4 })
  })
  it('expands RFD to Raleigh', () => {
    expect(fireStationName('RFD #12')).toEqual({ name: 'Raleigh Fire Station 12', stationNumber: 12 })
  })
  it('never invents a number for labels without one', () => {
    expect(fireStationName('Hopkins')).toEqual({ name: 'Hopkins Fire Station' })
    expect(fireStationName('Creedmoor ')).toEqual({ name: 'Creedmoor Fire Station' })
    expect(fireStationName('Durham Fire 17')).toEqual({ name: 'Durham Fire 17' })
    expect(fireStationName('')).toBeUndefined()
    expect(fireStationName(null)).toBeUndefined()
  })
})

describe('groupFireStations', () => {
  it('dedupes on STATIONID (not ID) and keeps the first record', () => {
    const out = groupFireStations([
      feat({ ID: 4, STATIONID: 'AF1', LABEL: 'Apex #1', LOCATION: '210 N Salem St', CITY: 'Apex', AGENCY: 'FD' }),
      feat({ ID: 4, STATIONID: 'AF4', LABEL: 'Apex #4', LOCATION: '1615 E Williams St', CITY: 'Apex', AGENCY: 'FD' }),
      feat({ ID: 4, STATIONID: 'af1', LABEL: 'Apex #1 again', LOCATION: 'x', CITY: 'Apex', AGENCY: 'FD' }),
    ])
    expect(out.map((s) => s.stationId)).toEqual(['AF1', 'AF4'])
    expect(out[0].name).toBe('Apex Fire Station 1')
  })
  it('skips records with no STATIONID, no usable label or no point', () => {
    expect(groupFireStations([feat({ LABEL: 'Cary #1' }), feat({ STATIONID: 'X1', LABEL: ' ' }), feat({ STATIONID: 'X2', LABEL: 'Cary #2' }, null)])).toEqual([])
  })
  it('builds the address from LOCATION and CITY and the operator only for known AGENCY codes', () => {
    const [cf, fd] = groupFireStations([
      feat({ STATIONID: 'CF9', LABEL: 'Cary #9', LOCATION: '1427 Walnut St', CITY: 'Cary', AGENCY: 'CF' }),
      feat({ STATIONID: 'AF1', LABEL: 'Apex #1', LOCATION: '210 N Salem St', CITY: 'Apex', AGENCY: 'FD' }),
    ])
    expect(cf.address).toBe('1427 Walnut St, Cary')
    expect(fireStationDescription(cf)).toBe("Fire station operated by Cary Fire Department, at 1427 Walnut St, Cary (from Wake County's fire stations layer).")
    expect(fireStationDescription(fd)).toBe("Fire station, at 210 N Salem St, Apex (from Wake County's fire stations layer).")
  })
})

describe('fire station visit fields', () => {
  it('know only the address; the 13 other fields stay unknown', () => {
    const fields = buildVisitFields({ fire: { address: '1427 Walnut St, Cary' }, dates: { fire: '2026-10-15' } }) as { key: string; status: string; value?: string; sourceId?: string }[]
    const known = fields.filter((f) => f.status === 'known')
    expect(fields).toHaveLength(14)
    expect(known).toEqual([expect.objectContaining({ key: 'address', value: '1427 Walnut St, Cary', sourceId: 'wake-fire-stations' })])
  })
})

describe('wake-fire-stations source', () => {
  const registry = JSON.parse(readFileSync(fileURLToPath(new URL('../pipeline/sources.config.json', import.meta.url)), 'utf8')) as { id: string }[]
  it('is registered as an open CC BY 4.0 source and the registry validates', () => {
    const s = registry.find((r) => r.id === 'wake-fire-stations') as Record<string, unknown>
    expect(s).toMatchObject({ licence: 'CC-BY-4.0', licenceStatus: 'open', cadence: 'monthly', attribution: 'Wake County GIS (CC BY 4.0)', enabled: true })
    expect(validateRegistry(registry)).toEqual([])
  })
})

describe('fire stations in the built catalog (real data)', () => {
  const out = builtCatalog()
  type P = { id: string; name: string; category: string; municipality: string; coverage: string; address?: string; stationNumber?: number; sourceIds: string[]; amenities?: string[] }
  const stations = (out.catalog.places as P[]).filter((p) => p.category === 'fire-station')

  it('includes all 89 snapshot records exactly once, with unique ids and only in-scope coverage', () => {
    expect(stations).toHaveLength(89)
    expect(new Set(stations.map((p) => p.id)).size).toBe(89)
    for (const p of stations) {
      expect(p.id).toMatch(/^wake-fire-[a-z0-9]+$/)
      expect(['core', 'nearby']).toContain(p.coverage)
      expect(p.sourceIds).toEqual(['wake-fire-stations'])
      expect(p.amenities).toBeUndefined()
    }
  })

  it('has the 9 Cary stations with the right addresses', () => {
    const cary = stations.filter((p) => /^Cary Fire Station \d$/.test(p.name))
    expect(cary.map((p) => p.name).sort()).toEqual(Array.from({ length: 9 }, (_, i) => `Cary Fire Station ${i + 1}`))
    expect(cary.every((p) => p.municipality === 'Cary')).toBe(true)
    const byNum = Object.fromEntries(cary.map((p) => [p.stationNumber, p.address]))
    expect(byNum[9]).toBe('1427 Walnut St, Cary')
    expect(byNum[1]).toBe('1501 N Harrison Ave, Cary')
    expect(byNum[7]).toBe('6900 Carpenter Fire Station Rd, Cary')
    expect(cary.find((p) => p.stationNumber === 9)?.id).toBe('wake-fire-cf9')
  })

  it('gives address-only visit details and links no park or trail to a station', () => {
    const d = out.details['wake-fire-cf9'] as { fields: { key: string; status: string }[] }
    expect(d.fields.filter((f) => f.status === 'known').map((f) => f.key)).toEqual(['address'])
    const rel = (out.relationships as { relationships: { from: string; to: string }[] }).relationships
    expect(rel.some((r) => r.from.startsWith('wake-fire-') || r.to.startsWith('wake-fire-'))).toBe(false)
  })

  it('credits Wake County under CC BY 4.0', () => {
    const s = (out.catalog.sources as { id: string; license: string; name: string }[]).find((x) => x.id === 'wake-fire-stations')
    expect(s).toMatchObject({ name: 'Wake County', license: 'CC BY 4.0' })
  })
})

describe('station number is data for search, not a card row', () => {
  it('VisitInfo never renders stationNumber (it has no source line)', () => {
    const src = readFileSync(fileURLToPath(new URL('../src/features/places/VisitInfo.tsx', import.meta.url)), 'utf8')
    expect(src).not.toMatch(/stationNumber/)
    expect(src).not.toMatch(/label="Station"/)
  })
  it('the catalog keeps stationNumber, which search uses', () => {
    const p = (builtCatalog().catalog.places as { id: string; stationNumber?: number }[]).find((x) => x.id === 'wake-fire-cf9')
    expect(p?.stationNumber).toBe(9)
  })
})
