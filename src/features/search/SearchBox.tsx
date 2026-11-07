// Search combobox over the full catalog, limited to active themes, with full ARIA combobox keyboard support.
import { useId, useState, type KeyboardEvent } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { CategoryBadge } from '../themes/CategoryIcon'
import { categoryLabel, getTheme } from '../themes/themes'
import { usePlaces } from '../places/usePlaces'
import { emptyLayersText } from '../themes/layerSelection'
import { useLayerSearch } from './useLayerSearch'

const MAX_RESULTS = 8

export function SearchBox() {
  const activeThemes = useAppStore((s) => s.activeThemes)
  const query = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId)
  const setView = useAppStore((s) => s.setView)

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const baseId = useId()
  const listId = `${baseId}-list`

  const { status, retry } = usePlaces()
  // Same selection as the map and list: hidden layers are not searched, but named when they hold the matches.
  const { results, hiddenLayers } = useLayerSearch(query, MAX_RESULTS, true)

  const hasQuery = query.trim() !== ''
  const expanded = open && results.length > 0
  const noThemes = activeThemes.length === 0
  // Why the results area is empty. Loading and failure take priority over "No places found".
  const emptyMessage =
    status === 'loading'
      ? 'Loading places…'
      : status === 'error'
        ? "Couldn't load places."
        : noThemes
          ? 'No themes selected'
          : `No places found.${hiddenLayers.length ? ` ${emptyLayersText(hiddenLayers)}` : ''}`
  const showEmpty = hasQuery && results.length === 0 && (status === 'error' || open)
  const active = Math.min(activeIndex, results.length - 1)
  const optionId = (i: number) => `${baseId}-opt-${i}`

  function select(i: number) {
    const place = results[i]
    if (!place) return
    setSelectedPlaceId(place.id)
    setSearchQuery('')
    setOpen(false)
    setView('map')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (results.length === 0) return
      e.preventDefault()
      setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((Math.max(active, 0) + step + results.length) % results.length)
    } else if (e.key === 'Enter') {
      if (expanded) {
        e.preventDefault()
        select(active)
      }
    } else if (e.key === 'Escape') {
      if (expanded) setOpen(false)
      else setSearchQuery('')
    }
  }

  return (
    <div className="relative">
      <label htmlFor={`${baseId}-input`} className="sr-only">
        Search places
      </label>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-ink-muted"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        id={`${baseId}-input`}
        type="text"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded ? optionId(active) : undefined}
        autoComplete="off"
        placeholder="Search parks, trails, creeks…"
        value={query}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-12 w-full rounded-control border border-edge bg-ground pr-4 pl-11 text-base text-ink placeholder:text-ink-muted focus:border-forest focus:bg-white focus:shadow-[0_0_0_4px_var(--color-pine-glow)] focus:outline-none"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Search results"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto rounded-card border border-line bg-white p-1.5 shadow-[0_12px_32px_rgba(31,42,36,0.14)]"
      >
        {results.map((place, i) => (
          <li
            key={place.id}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            // Keep focus in the input so the combobox stays active while clicking.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(i)}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-control px-3 text-sm ${
              i === active ? 'bg-forest-tint' : ''
            }`}
          >
            <CategoryBadge
              category={place.category}
              color={getTheme(place.theme).color}
              size="sm"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{place.name}</span>
              <span className="block truncate text-[13px] text-ink-muted">
                {categoryLabel[place.category]} · {place.municipality}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {showEmpty && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 space-y-2 rounded-card border border-line bg-white px-4 py-3 text-sm text-ink-muted shadow-[0_12px_32px_rgba(31,42,36,0.14)]">
          <p>{emptyMessage}</p>
          {status === 'error' && (
            <button
              type="button"
              onClick={retry}
              className="min-h-11 rounded-control border border-forest px-4 text-sm font-semibold text-forest hover:bg-forest-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link"
            >
              Try again
            </button>
          )}
        </div>
      )}
      <div role="status" className="sr-only">
        {!hasQuery
          ? ''
          : results.length === 0
            ? emptyMessage
            : results.length === 1
              ? '1 result'
              : `${results.length} results`}
      </div>
    </div>
  )
}
