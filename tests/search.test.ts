import { describe, expect, it } from 'vitest'
import { createPlaceSearch } from '../src/features/search/searchIndex'
import { getSharedPlaceSearch } from '../src/features/search/usePlaceSearch'
import { CATEGORY_THEME } from '../src/features/themes/themes'
import type { CategoryId, Place } from '../src/types/place'

// Synthetic fixtures only, not real destinations. `theme` is derived from `category`, as the catalog parser does.
const sample = (id: string, name: string, overrides: Partial<Place> = {}): Place => {
  const category: CategoryId = overrides.category ?? 'park'
  return {
    id,
    name,
    aliases: [],
    municipality: 'Example Town',
    centroid: [-78.8, 35.8],
    description: 'Synthetic test record.',
    sourceIds: ['example-source'],
    ...overrides,
    category,
    theme: CATEGORY_THEME[category],
  }
}

describe('regional discovery', () => {
  it('finds a misspelled place from the full catalog without map state', () => {
    const search = createPlaceSearch([sample('park-1', 'Hemlock Example Preserve')])
    expect(search('Hemlok Example').map((p) => p.id)).toEqual(['park-1'])
  })

  it('finds aliases and applies municipal filtering before the result limit', () => {
    const search = createPlaceSearch([
      sample('trail-a', 'Example Trail', { aliases: ['ET'], municipality: 'Town A' }),
      sample('trail-b', 'Example Trail', { aliases: ['ET'], municipality: 'Town B' }),
    ])
    expect(search('ET', { municipality: 'Town B' }, 1).map((p) => p.id)).toEqual(['trail-b'])
  })

  it('never substitutes a similar station number', () => {
    const search = createPlaceSearch([
      sample('station-7', 'Example Town Station 7', { category: 'fire-station', stationNumber: 7 }),
      sample('station-17', 'Example Town Station 17', { category: 'fire-station', stationNumber: 17 }),
    ])
    expect(search('Example Town fire station 7').map((p) => p.id)).toEqual(['station-7'])
    expect(search('station 8')).toEqual([])
  })

  it('excludes places whose theme is not selected', () => {
    const search = createPlaceSearch([
      sample('park-1', 'Example Park'),
      sample('history-1', 'Example Homestead', { category: 'history' }),
      sample('water-1', 'Example Lake', { category: 'water' }),
    ])
    expect(search('', { themes: ['history'] }).map((p) => p.id)).toEqual(['history-1'])
    expect(search('', { themes: ['parks-trails', 'water'] }).map((p) => p.id)).toEqual([
      'water-1',
      'park-1',
    ])
  })

  it('returns every place in name order for an empty query', () => {
    const search = createPlaceSearch([
      sample('town-b', 'Town B Hall'),
      sample('park-1', 'Example Park'),
      sample('trail-1', 'Alpha Trail'),
    ])
    expect(search('').map((p) => p.id)).toEqual(['trail-1', 'park-1', 'town-b'])
    expect(search('   ').map((p) => p.id)).toEqual(['trail-1', 'park-1', 'town-b'])
  })
})

describe('shared place search', () => {
  it('returns the same search for the same places array and a new one for a new array', () => {
    const places = [sample('park-1', 'Hemlock Example Preserve')]
    const first = getSharedPlaceSearch(places)
    expect(getSharedPlaceSearch(places)).toBe(first)
    const next = [...places]
    const second = getSharedPlaceSearch(next)
    expect(second).not.toBe(first)
    expect(getSharedPlaceSearch(next)).toBe(second)
  })
})
