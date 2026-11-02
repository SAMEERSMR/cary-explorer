// Core domain types: a canonical Place (centroid and bbox as [lon, lat]) and the Source it came from.
export type ThemeId = 'parks-trails' | 'history' | 'birds-wildlife' | 'water' | 'art-community'

export interface Place {
  id: string
  name: string
  aliases: string[]
  theme: ThemeId
  town?: string
  county?: string
  centroid: [number, number]
  bbox?: [number, number, number, number]
  sourceIds: string[]
  description?: string
}

export interface Source {
  id: string
  name: string
  url: string
  license?: string
  retrievedAt?: string
}
