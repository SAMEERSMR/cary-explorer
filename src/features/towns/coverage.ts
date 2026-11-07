// Town filter options and the per-town, per-theme source coverage (from docs/source-matrix.md §2 and §6). Pure: no React.
import type { Place, ThemeId } from '../../types/place'

export interface Town {
  slug: string
  /** Exactly the `municipality` value the catalog uses. */
  label: string
}

export const TOWNS: readonly Town[] = [
  { slug: 'cary', label: 'Cary' },
  { slug: 'apex', label: 'Apex' },
  { slug: 'morrisville', label: 'Morrisville' },
  { slug: 'raleigh', label: 'Raleigh' },
  { slug: 'garner', label: 'Garner' },
  { slug: 'holly-springs', label: 'Holly Springs' },
  { slug: 'fuquay-varina', label: 'Fuquay-Varina' },
  { slug: 'knightdale', label: 'Knightdale' },
  { slug: 'wendell', label: 'Wendell' },
  { slug: 'zebulon', label: 'Zebulon' },
  { slug: 'wake-forest', label: 'Wake Forest' },
  { slug: 'rolesville', label: 'Rolesville' },
  { slug: 'unincorporated-wake', label: 'Unincorporated Wake County' },
]

/** `data` = a usable source exists; `gap` = nothing found; `region-wide-only` = only county/state/national layers. */
export type CoverageStatus = 'data' | 'gap' | 'region-wide-only'

const D: CoverageStatus = 'data'
const G: CoverageStatus = 'gap'
const R: CoverageStatus = 'region-wide-only'

type ThemeRow = Record<ThemeId, CoverageStatus>
const row = (parks: CoverageStatus, history: CoverageStatus, birds: CoverageStatus, water: CoverageStatus, art: CoverageStatus): ThemeRow => ({
  'parks-trails': parks,
  history,
  'birds-wildlife': birds,
  water,
  'art-community': art,
})

// Parks & trails is `data` everywhere (Wake parks); trail-only gaps in Knightdale, Wendell, Zebulon and Fuquay-Varina are partial, not whole-theme.
export const COVERAGE: Readonly<Record<string, ThemeRow>> = {
  cary: row(D, R, R, D, D),
  apex: row(D, D, R, D, D),
  morrisville: row(D, R, R, D, G),
  raleigh: row(D, D, D, D, D),
  garner: row(D, R, R, D, G),
  'holly-springs': row(D, D, R, D, G),
  'fuquay-varina': row(D, R, R, D, G),
  knightdale: row(D, R, R, D, G),
  wendell: row(D, R, R, D, G),
  zebulon: row(D, R, R, D, G),
  'wake-forest': row(D, D, R, D, G),
  rolesville: row(D, R, R, D, G),
  'unincorporated-wake': row(D, R, R, D, G),
}

const OTHER_COUNTY_PART: Readonly<Record<string, string>> = {
  apex: 'Chatham',
  morrisville: 'Durham',
  raleigh: 'Durham',
  'wake-forest': 'Franklin',
}

export function townBySlug(slug: string | null | undefined): Town | null {
  return TOWNS.find((t) => t.slug === slug) ?? null
}

export function townByLabel(label: string | null | undefined): Town | null {
  return TOWNS.find((t) => t.label === label) ?? null
}

export function isTownSlug(value: string | null | undefined): value is string {
  return townBySlug(value) !== null
}

/** The town sentence shown under the filter, or null for "all towns" / an unknown slug. */
export function townNote(slug: string | null): string | null {
  const town = townBySlug(slug)
  if (!town) return null
  if (town.slug === 'cary') return 'Complete: Wake, Chatham and Durham parts (parks and trails)'
  if (town.slug === 'unincorporated-wake') return 'Wake County outside town limits'
  const part = OTHER_COUNTY_PART[town.slug]
  if (part) return `Wake portion complete. The ${part} portion shows nearby places only.`
  return 'Whole town is in Wake County'
}

export function themeStatus(slug: string | null, theme: ThemeId): CoverageStatus | null {
  if (!slug) return null
  return COVERAGE[slug]?.[theme] ?? null
}

/** Places in the chosen town (all places when `slug` is null or unknown). */
export function placesInTown<T extends Pick<Place, 'municipality'>>(places: readonly T[], slug: string | null): T[] {
  const town = townBySlug(slug)
  return town ? places.filter((p) => p.municipality === town.label) : [...places]
}

/** Theme and town filter on top of each other. */
export function filterPlaces<T extends Pick<Place, 'municipality' | 'theme'>>(
  places: readonly T[],
  activeThemes: readonly ThemeId[],
  slug: string | null,
): T[] {
  const town = townBySlug(slug)
  return places.filter((p) => activeThemes.includes(p.theme) && (!town || p.municipality === town.label))
}

/** Active themes with no places in the chosen town; `gap` = nothing found upstream, otherwise data exists but is not imported yet. Empty when no town is chosen. */
export function emptyThemes(
  places: readonly Pick<Place, 'municipality' | 'theme'>[],
  activeThemes: readonly ThemeId[],
  slug: string | null,
): { theme: ThemeId; kind: 'gap' | 'not-imported' }[] {
  const town = townBySlug(slug)
  if (!town) return []
  return activeThemes
    .filter((theme) => !places.some((p) => p.municipality === town.label && p.theme === theme))
    .map((theme) => ({ theme, kind: themeStatus(slug, theme) === 'gap' ? ('gap' as const) : ('not-imported' as const) }))
}

/** The one-line message for an empty theme in a town. */
export function emptyThemeText(themeLabel: string, townLabel: string, kind: 'gap' | 'not-imported'): string {
  return kind === 'gap'
    ? `No data yet for ${themeLabel} in ${townLabel}.`
    : `${themeLabel} places for ${townLabel} aren't in the app yet.`
}

/** Label text for a place's coverage; null for core or unspecified. */
export function coverageText(coverage: Place['coverage']): string | null {
  if (coverage === 'nearby') return 'Nearby, outside core area'
  if (coverage === 'outside') return 'Outside coverage area'
  return null
}
