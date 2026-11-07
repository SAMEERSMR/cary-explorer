import type { Polygon, Position } from './geo.mjs'
export const NEARBY_M: number
export const NEAREST_MAX_M: number
export interface RelationshipItem {
  id: string
  kind: 'park' | 'trail'
  polygons?: Polygon[]
  lines?: Position[][]
  points?: Position[]
}
export interface Relationship {
  from: string
  to: string
  kind: 'contained' | 'nearby' | 'curated'
  distanceM?: number
  basis?: 'within-400m' | 'nearest'
}
export function computeRelationships(items: RelationshipItem[]): { relationships: Relationship[] }
