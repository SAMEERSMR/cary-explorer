import { describe, expect, it } from 'vitest'
import {
  TOWNS,
  coverageText,
  filterPlaces,
  emptyThemeText,
  emptyThemes,
  isTownSlug,
  placesInTown,
  themeStatus,
  townByLabel,
  townBySlug,
  townNote,
} from '../src/features/towns/coverage'
import type { ThemeId } from '../src/types/place'

const p = (municipality: string, theme: ThemeId) => ({ municipality, theme })
const ALL: ThemeId[] = ['parks-trails', 'history', 'birds-wildlife', 'water', 'art-community']

describe('towns', () => {
  it('lists 13 unique options', () => {
    expect(TOWNS).toHaveLength(13)
    expect(new Set(TOWNS.map((t) => t.slug)).size).toBe(13)
    expect(townBySlug('holly-springs')?.label).toBe('Holly Springs')
    expect(townByLabel('Unincorporated Wake County')?.slug).toBe('unincorporated-wake')
    expect(isTownSlug('nope')).toBe(false)
    expect(isTownSlug(null)).toBe(false)
  })
  it('writes the town notes', () => {
    expect(townNote(null)).toBeNull()
    expect(townNote('cary')).toBe('Complete: Wake, Chatham and Durham parts (parks and trails)')
    expect(townNote('apex')).toBe('Wake portion complete. The Chatham portion shows nearby places only.')
    expect(townNote('morrisville')).toContain('Durham portion')
    expect(townNote('raleigh')).toContain('Durham portion')
    expect(townNote('wake-forest')).toContain('Franklin portion')
    expect(townNote('zebulon')).toBe('Whole town is in Wake County')
    expect(townNote('unincorporated-wake')).toBe('Wake County outside town limits')
  })
  it('has a status for every town and theme', () => {
    for (const t of TOWNS) for (const th of ALL) expect(themeStatus(t.slug, th)).not.toBeNull()
    expect(themeStatus('zebulon', 'art-community')).toBe('gap')
    expect(themeStatus('cary', 'art-community')).toBe('data')
    expect(themeStatus(null, 'water')).toBeNull()
  })
})

describe('filtering', () => {
  const places = [p('Cary', 'water'), p('Apex', 'water'), p('Apex', 'history'), p('Zebulon', 'water')]
  it('filters by theme and town', () => {
    expect(filterPlaces(places, ALL, null)).toHaveLength(4)
    expect(filterPlaces(places, ALL, 'apex')).toHaveLength(2)
    expect(filterPlaces(places, ['water'], 'apex')).toEqual([p('Apex', 'water')])
    expect(filterPlaces(places, ALL, 'unknown')).toHaveLength(4)
    expect(placesInTown(places, 'cary')).toEqual([p('Cary', 'water')])
  })
  it('reports every active theme with no places in the town', () => {
    expect(emptyThemes(places, ALL, null)).toEqual([])
    expect(emptyThemes(places, ['art-community'], 'zebulon')).toEqual([{ theme: 'art-community', kind: 'gap' }])
    expect(emptyThemes(places, ['history', 'art-community'], 'zebulon')).toEqual([
      { theme: 'history', kind: 'not-imported' },
      { theme: 'art-community', kind: 'gap' },
    ])
    expect(emptyThemes([...places, p('Zebulon', 'art-community')], ['art-community'], 'zebulon')).toEqual([])
  })
  it('words the messages by kind', () => {
    expect(emptyThemeText('Art & community', 'Zebulon', 'gap')).toBe('No data yet for Art & community in Zebulon.')
    expect(emptyThemeText('History', 'Apex', 'not-imported')).toBe("History places for Apex aren't in the app yet.")
  })
})

describe('coverage label', () => {
  it('only labels nearby and outside', () => {
    expect(coverageText('nearby')).toBe('Nearby, outside core area')
    expect(coverageText('outside')).toBe('Outside coverage area')
    expect(coverageText('core')).toBeNull()
    expect(coverageText(undefined)).toBeNull()
  })
})
