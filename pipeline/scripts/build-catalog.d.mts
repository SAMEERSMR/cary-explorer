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
export function build(options?: { write?: boolean }): {
  catalog: { sources: unknown[]; places: Record<string, unknown>[] }
  outputs: Record<string, string>
  parks: ParkGroup[]
  kept: GreenwayGroup[]
  dropped: GreenwayGroup[]
  neighbours: number
  ids: Record<string, string>
}
export function carynUrl(url: unknown): unknown
