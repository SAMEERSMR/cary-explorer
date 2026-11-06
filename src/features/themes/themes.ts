// Catalogue of the five themes that places are grouped under, each with its map/UI colour.
import type { CategoryId, ThemeId } from '../../types/place'

export interface Theme {
  id: ThemeId
  label: string
  color: string
  /** Pale tint of the theme colour, for chips and backgrounds. */
  tint: string
}

export const THEMES: readonly Theme[] = [
  { id: 'parks-trails', label: 'Parks & trails', color: '#3A7D44', tint: '#E4EFDF' },
  { id: 'history', label: 'History', color: '#9A4A2E', tint: '#F3E4DC' },
  { id: 'birds-wildlife', label: 'Birds & wildlife', color: '#B87000', tint: '#F7EBD3' },
  { id: 'water', label: 'Water', color: '#2C6E9E', tint: '#DFEBF4' },
  { id: 'art-community', label: 'Art & community', color: '#7A4E8C', tint: '#EDE3F1' },
]

export function getTheme(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

export const CATEGORY_THEME: Record<CategoryId, ThemeId> = {
  park: 'parks-trails',
  trail: 'parks-trails',
  history: 'history',
  wildlife: 'birds-wildlife',
  water: 'water',
  art: 'art-community',
  community: 'art-community',
  'fire-station': 'art-community',
}

export const categoryLabel: Record<CategoryId, string> = {
  park: 'Park',
  trail: 'Trail',
  history: 'History',
  wildlife: 'Wildlife',
  water: 'Water',
  art: 'Art',
  community: 'Community',
  'fire-station': 'Fire station',
}
