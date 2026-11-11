import { describe, expect, it } from 'vitest'
import { showsParkVisitFields } from '../src/features/places/placeDetails'

describe('which cards show the park visit fields', () => {
  it('hides the not-verified block for fire stations, watersheds and creeks (water)', () => {
    expect(showsParkVisitFields('fire-station')).toBe(false)
    expect(showsParkVisitFields('water')).toBe(false)
  })
  it('keeps it for parks, trails and every other category', () => {
    for (const c of ['park', 'trail', 'history', 'wildlife', 'art', 'community'] as const) expect(showsParkVisitFields(c), c).toBe(true)
  })
})
