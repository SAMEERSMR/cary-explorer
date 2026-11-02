// Core domain types: a canonical Place (centroid and bbox as [lon, lat]) and the Source it came from.
export type ThemeId = 'parks-trails' | 'history' | 'birds-wildlife' | 'water' | 'art-community'

export type CategoryId =
  | 'park'
  | 'trail'
  | 'history'
  | 'wildlife'
  | 'water'
  | 'art'
  | 'community'
  | 'fire-station'

export interface Place {
  id: string
  name: string
  aliases: string[]
  category: CategoryId
  /** Derived from `category` by the catalog parser; not stored in the JSON. */
  theme: ThemeId
  municipality: string
  county?: string
  /** Representative point in WGS84 [lon, lat], not a guaranteed entrance. */
  centroid: [number, number]
  bbox?: [number, number, number, number]
  description: string
  address?: string
  stationNumber?: number
  /** At least one; each id matches a Source in the catalog. */
  sourceIds: string[]
}

export interface Source {
  id: string
  name: string
  url: string
  license?: string
  retrievedAt?: string
}
