// Accessible list of places in the active themes: name order, or relevance order while searching.
import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { usePlaceSearch } from '../search/usePlaceSearch'
import { THEMES, categoryLabel, getTheme } from '../themes/themes'
import { usePlaces } from './usePlaces'

const ACTION_BUTTON =
  'min-h-11 rounded-lg border border-neutral-500 px-4 text-sm font-medium hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'

export function ListView() {
  const { status, retry } = usePlaces()
  const activeThemes = useAppStore((s) => s.activeThemes)
  const query = useAppStore((s) => s.searchQuery)
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId)
  const setSheetState = useAppStore((s) => s.setSheetState)
  const setView = useAppStore((s) => s.setView)
  const setActiveThemes = useAppStore((s) => s.setActiveThemes)
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId)

  const search = usePlaceSearch()
  // Empty query yields name order; otherwise keep the search's relevance order.
  const rows = useMemo(
    () => search(query, { themes: activeThemes }, Infinity),
    [search, query, activeThemes],
  )

  if (rows.length === 0) {
    const noThemes = status === 'ready' && activeThemes.length === 0
    const trimmed = query.trim()
    const text =
      status === 'loading'
        ? 'Loading places…'
        : status === 'error'
          ? 'Could not load places.'
          : noThemes
            ? 'No themes selected — turn on a theme to see places.'
            : trimmed
              ? `No places match “${trimmed}”.`
              : 'No places match the selected themes.'
    return (
      <div className="space-y-2">
        <p className="text-sm text-neutral-600">{text}</p>
        {status === 'error' && (
          <button type="button" onClick={retry} className={ACTION_BUTTON}>
            Try again
          </button>
        )}
        {noThemes && (
          <button
            type="button"
            onClick={() => setActiveThemes(THEMES.map((t) => t.id))}
            className={ACTION_BUTTON}
          >
            Turn on all themes
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
              // Show the card: switch to map view (desktop and mobile), and on mobile reveal the map at half height.
              setView('map')
              setSheetState('half')
            }}
            data-place-id={place.id}
            aria-current={place.id === selectedPlaceId ? 'true' : undefined}
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              place.id === selectedPlaceId
                ? 'bg-blue-50 ring-2 ring-inset ring-blue-700'
                : 'hover:bg-neutral-100'
            }`}
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
