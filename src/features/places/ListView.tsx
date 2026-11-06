// Accessible list of places in the active themes: name order, or relevance order while searching.
import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { usePlaceSearch } from '../search/usePlaceSearch'
import { CategoryBadge } from '../themes/CategoryIcon'
import { THEMES, categoryLabel, getTheme } from '../themes/themes'
import { usePlaces } from './usePlaces'

const ACTION_BUTTON =
  'min-h-11 rounded-control border border-forest px-4 text-sm font-semibold text-forest hover:bg-forest-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link'

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
      <div className="space-y-3 rounded-card border border-dashed border-placeholder-line p-5">
        {noThemes ? (
          <>
            <p className="font-display text-xl font-semibold text-ink">Nothing to show yet</p>
            <p className="text-sm leading-relaxed text-ink-muted">
              Turn on a theme to see places on the map and in the list.
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-ink-muted">{text}</p>
        )}
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
    <ul aria-label="Places" className="flex flex-col gap-2">
      {rows.map((place) => {
        const selected = place.id === selectedPlaceId
        return (
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
              aria-current={selected ? 'true' : undefined}
              className={`flex min-h-[60px] w-full items-center gap-3 rounded-card border-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link ${
                selected
                  ? 'border-forest bg-forest-tint'
                  : 'border-line bg-white hover:border-edge'
              }`}
            >
              <CategoryBadge
                category={place.category}
                color={getTheme(place.theme).color}
                size={36}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-ink">{place.name}</span>
                <span className="block truncate text-[13px] text-ink-muted">
                  {categoryLabel[place.category]} · {place.municipality}
                </span>
              </span>
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 text-ink-muted"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
