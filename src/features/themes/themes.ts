// Catalogue of the five themes that places are grouped under, each with its map/UI colour.
import type { CategoryId, ThemeId } from '../../types/place'

export interface Theme {
  id: ThemeId
  label: string
  color: string
}

export const THEMES: readonly Theme[] = [
  { id: 'parks-trails', label: 'Parks & trails', color: '#2e8b4f' },
  { id: 'history', label: 'History', color: '#a0522d' },
  { id: 'birds-wildlife', label: 'Birds & wildlife', color: '#d98a00' },
  { id: 'water', label: 'Water', color: '#1f6fd1' },
  { id: 'art-community', label: 'Art & community', color: '#9b3fb5' },
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
