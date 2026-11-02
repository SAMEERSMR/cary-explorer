// Accessible list of places in the active themes: name order, or relevance order while searching.
import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { usePlaceSearch } from '../search/usePlaceSearch'
import { categoryLabel, getTheme } from '../themes/themes'
import { usePlaces } from './usePlaces'

export function ListView() {
  const { status, retry } = usePlaces()
  const activeThemes = useAppStore((s) => s.activeThemes)
  const query = useAppStore((s) => s.searchQuery)
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId)
  const setSheetState = useAppStore((s) => s.setSheetState)

  const search = usePlaceSearch()
  // Empty query yields name order; otherwise keep the search's relevance order.
  const rows = useMemo(
    () => search(query, { themes: activeThemes }, Infinity),
    [search, query, activeThemes],
  )

  if (rows.length === 0) {
    const text =
      status === 'loading'
        ? 'Loading places…'
        : status === 'error'
          ? 'Could not load places.'
          : 'No places match your search or selected themes.'
    return (
      <div className="space-y-2">
        <p className="text-sm text-neutral-600">{text}</p>
        {status === 'error' && (
          <button
            type="button"
            onClick={retry}
            className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Try again
          </button>
        )}
      </div>
    )
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
              <span className="block truncate text-xs text-neutral-600">
                {categoryLabel[place.category]} · {place.municipality}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
