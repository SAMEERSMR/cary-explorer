// Catalogue of the five themes that places are grouped under.
import type { ThemeId } from '../../types/place'

export const THEMES: readonly { id: ThemeId; label: string }[] = [
  { id: 'parks-trails', label: 'Parks & trails' },
  { id: 'history', label: 'History' },
  { id: 'birds-wildlife', label: 'Birds & wildlife' },
  { id: 'water', label: 'Water' },
  { id: 'art-community', label: 'Art & community' },
]
