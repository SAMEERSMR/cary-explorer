// Accessible list of places in the active themes, sorted by name and filtered by the search query.
import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { buildSearchIndex, searchPlaces } from '../search/searchIndex'
import { getTheme } from '../themes/themes'
import { useFilteredPlaces } from './useFilteredPlaces'

export function ListView() {
  const { places, status } = useFilteredPlaces()
  const query = useAppStore((s) => s.searchQuery)
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId)
  const setSheetState = useAppStore((s) => s.setSheetState)

  const index = useMemo(() => buildSearchIndex(places), [places])
  const rows = useMemo(() => {
    const matches = query.trim() ? searchPlaces(index, places, query) : places
    return [...matches].sort((a, b) => a.name.localeCompare(b.name))
  }, [index, places, query])

  if (rows.length === 0) {
    const text =
      status === 'loading'
        ? 'Loading places…'
        : status === 'error'
          ? 'Could not load places.'
          : 'No places match your search or selected themes.'
    return <p className="text-sm text-neutral-600">{text}</p>
  }

  return (
    <ul aria-label="Places" className="-mx-2">
      {rows.map((place) => (
        <li key={place.id}>
          <button
            type="button"
            onClick={() => {
              setSelectedPlaceId(place.id)
              // Reveal the map behind the sheet on mobile.
              setSheetState('half')
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: getTheme(place.theme).color }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{place.name}</span>
              {place.town && <span className="block text-xs text-neutral-600">{place.town}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
