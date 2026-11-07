import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { classify, classifyLine, clipToLimit, createScope, splitByCore } from '../pipeline/lib/geo.mjs'
import { computeRelationships, type RelationshipItem } from '../pipeline/lib/relationships.mjs'

const rect = (x0: number, y0: number, x1: number, y1: number) => ({
  type: 'Polygon',
  coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]],
})
// Synthetic scope on a flat plane: core x 0..10, buffer x -5..15, crossing limit x -8..18 (y -5..5 throughout).
const scope = createScope({
  core: rect(0, -5, 10, 5),
  nearby: rect(-5, -5, 15, 5),
  crossing: rect(-8, -5, 18, 5),
})

describe('classify', () => {
  it('sorts points into core, nearby and outside', () => {
    expect(classify([5, 0], scope)).toBe('core')
    expect(classify([12, 0], scope)).toBe('nearby')
    expect(classify([-3, 0], scope)).toBe('nearby')
    expect(classify([16, 0], scope)).toBe('outside')
    expect(classify([5, 50], scope)).toBe('outside')
  })
  it('classifies lines by their best vertex', () => {
    expect(classifyLine([[[-4, 0], [5, 0]]], scope)).toBe('core')
    expect(classifyLine([[[11, 0], [14, 0]]], scope)).toBe('nearby')
    expect(classifyLine([[[16, 0], [17, 0]]], scope)).toBe('outside')
  })
  it('works with the real polygons: Cary is core, Raleigh is core, Greensboro is outside', () => {
    const load = (f: string) => JSON.parse(readFileSync(new URL(`../pipeline/sources/boundaries/${f}`, import.meta.url), 'utf8'))
    const real = createScope({
      core: load('core.geojson'),
      nearby: load('nearby-buffer.geojson'),
      crossing: load('crossing-limit.geojson'),
    })
    expect(classify([-78.78, 35.79], real)).toBe('core')
    expect(classify([-78.64, 35.78], real)).toBe('core')
    expect(classify([-79.79, 36.07], real)).toBe('outside')
  })
})

describe('clipToLimit', () => {
  // A trail running west to east across the core's west edge (x = 0) and out of the crossing limit (x = -8).
  const trail = [[[-12, 0], [-6, 0], [-3, 0], [2, 0], [6, 0]]]
  const clipped = clipToLimit(trail, scope.crossing, scope.core)
  it('keeps the whole part inside the crossing limit and cuts the rest', () => {
    expect(clipped.lines).toHaveLength(1)
    const xs = clipped.lines[0].map((p: number[]) => p[0])
    expect(Math.min(...xs)).toBeGreaterThan(-8.01)
    expect(Math.min(...xs)).toBeLessThan(-7.99)
    expect(xs).toContain(-6)
    expect(xs).toContain(6)
    expect(xs).not.toContain(-12)
  })
  it('flags parts outside the core, and splits them from the core part', () => {
    expect(clipped.partsOutsideCore).toBe(true)
    const parts = splitByCore(clipped.lines, scope.core)
    expect(parts.inside).toHaveLength(1)
    expect(parts.outside).toHaveLength(1)
    expect(parts.inside[0][0][0]).toBeCloseTo(0, 2)
    expect(parts.outside[0].at(-1)![0]).toBeCloseTo(0, 2)
    expect(parts.outside[0].every((p: number[]) => p[0] <= 0.01)).toBe(true)
  })
  it('reports no outside parts for a trail entirely in the core', () => {
    const r = clipToLimit([[[1, 0], [9, 0]]], scope.crossing, scope.core)
    expect(r).toEqual({ lines: [[[1, 0], [9, 0]]], partsOutsideCore: false })
  })
  it('drops a trail wholly beyond the limit', () => {
    expect(clipToLimit([[[20, 0], [25, 0]]], scope.crossing, scope.core).lines).toEqual([])
  })
})

describe('relationships', () => {
  // ~0.001 deg of latitude is about 111 m.
  const sq = (x: number, y: number, s = 0.002) => [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]]
  const items: RelationshipItem[] = [
    { id: 'park-a', kind: 'park', polygons: [sq(-78.8, 35.8)] },
    { id: 'park-b', kind: 'park', polygons: [sq(-78.8, 35.8035)] }, // ~150 m north of A
    { id: 'park-far', kind: 'park', polygons: [sq(-78.7, 35.9)] },
    { id: 'trail-in', kind: 'trail', lines: [[[-78.7995, 35.8005], [-78.7995, 35.801]]] }, // inside park-a
    { id: 'trail-near', kind: 'trail', lines: [[[-78.795, 35.8], [-78.795, 35.801]]] }, // ~300 m east of A
    { id: 'trail-far', kind: 'trail', lines: [[[-78.6, 35.7], [-78.6, 35.71]]] },
  ]
  const { relationships } = computeRelationships(items)
  it('links a trail with a vertex inside a park as contained', () => {
    expect(relationships).toContainEqual({ from: 'trail-in', to: 'park-a', kind: 'contained' })
  })
  it('links parks and trails within 400 m as nearby, and never trail to trail', () => {
    expect(relationships).toContainEqual({ from: 'park-a', to: 'park-b', kind: 'nearby' })
    expect(relationships).toContainEqual({ from: 'park-a', to: 'trail-near', kind: 'nearby' })
    expect(relationships.some((r: { from: string; to: string }) => r.to === 'park-far' || r.from === 'park-far')).toBe(false)
    expect(relationships.some((r: { from: string; to: string }) => r.from.startsWith('trail') && r.to.startsWith('trail'))).toBe(false)
  })
  it('does not repeat a contained pair as nearby', () => {
    expect(relationships.filter((r: { from: string; to: string }) => r.from === 'trail-in' && r.to === 'park-a')).toHaveLength(1)
  })
  it('is deterministic and independent of input order', () => {
    expect(computeRelationships([...items].reverse())).toEqual(computeRelationships(items))
    expect(JSON.stringify(computeRelationships(items))).toBe(JSON.stringify({ relationships }))
    const kinds = relationships.map((r: { kind: string }) => r.kind)
    expect(kinds).toEqual([...kinds].sort())
  })
})
