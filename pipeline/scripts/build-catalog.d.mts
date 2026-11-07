// Types for the helpers that tests import from build-catalog.mjs.
export type Position = number[]
export type Ring = Position[]
export type Polygon = Ring[]
export function normalize(name: unknown): string
export function slug(text: string): string
export function round(n: number, decimals?: number): number
export function pointInPolygon(point: Position, polygon: Polygon): boolean
export function pointInGeometry(point: Position, geometry: unknown): boolean
export function centroid(polygons: Polygon[]): [number, number]
export function bboxOf(positions: Position[]): [number, number, number, number]
export function vertexNearestBboxCentre(positions: Position[]): [number, number]
export interface ParkGroup {
  key: string
  name: string
  category: 'park' | 'community'
  kind: string
  acres: number
  polygons: Polygon[]
  parcels: number
}
export interface GreenwayGroup {
  key: string
  name: string
  miles: number
  lines: Position[][]
  segments: number
}
export function groupParks(features: unknown[]): ParkGroup[]
export function groupGreenways(features: unknown[]): { kept: GreenwayGroup[]; dropped: GreenwayGroup[] }
export function assignIds(
  existing: Record<string, string>,
  entries: { key: string; prefix: string; name: string }[],
): Record<string, string>
export const TOWNS: string[]
export const UNINCORPORATED_WAKE: string
export function municipalityOf(
  point: Position,
  towns: { features: { properties?: { BASENAME?: string }; geometry: unknown }[] },
  county: string | undefined,
): string
export function stripJurisdiction(jurisdiction: unknown): string
export function build(options?: { write?: boolean; outDir?: string }): {
  relationships: {
    relationships: { from: string; to: string; kind: string; distanceM?: number; basis?: string }[]
  }
  dedupeSkips: { name: string; caryId: string; distanceM: number }[]
  catalog: { sources: unknown[]; places: Record<string, unknown>[] }
  outputs: Record<string, string>
  details: Record<string, { id: string; fields: import('../lib/visit.mjs').VisitField[] }>
  parks: ParkGroup[]
  kept: GreenwayGroup[]
  dropped: GreenwayGroup[]
  neighbours: number
  skipped: { inCary: number; outside: number; duplicate: number }
  jurisdictionMismatches: { name: string; jurisdiction: string; municipality: string }[]
  ids: Record<string, string>
}
export function carynUrl(url: unknown): unknown
export const DEDUPE_M: number
export function findCaryTwin(
  name: unknown,
  pt: Position,
  caryNames: { id: string; centroid: Position; names: Set<string> }[],
): { id: string; centroid: Position; names: Set<string> } | undefined
export const ENTRANCE_NAME_MAX_M: number
export function joinEntrances(
  place: { name: string; aliases?: string[]; centroid: Position },
  ctx: { polygons?: Polygon[] } | undefined,
  entrances: { geometry?: { coordinates?: Position }; properties?: Record<string, unknown> }[],
  aliasNames?: string[],
  otherNames?: Set<string>,
): { geometry?: { coordinates?: Position }; properties?: Record<string, unknown> }[]
export function buildDetails(
  places: { id: string; name: string; aliases?: string[]; centroid: Position }[],
  visitCtx: Map<string, Record<string, unknown>>,
  entrances: unknown[],
  aliasMap: Record<string, string[]>,
  dates: { wake?: string; entrances?: string; caryFeatures?: string; greenways?: string },
): Record<string, { id: string; fields: import('../lib/visit.mjs').VisitField[] }>
