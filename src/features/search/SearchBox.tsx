// Search combobox over the full catalog, limited to active themes, with full ARIA combobox keyboard support.
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { categoryLabel, getTheme } from '../themes/themes'
import { usePlaces } from '../places/usePlaces'
import { usePlaceSearch } from './usePlaceSearch'

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

  const search = usePlaceSearch()
  const { status, retry } = usePlaces()
  const results = useMemo(
    () => (query.trim() ? search(query, { themes: activeThemes }, MAX_RESULTS) : []),
    [search, query, activeThemes],
  )

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
          : 'No places found'
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
      <input
        id={`${baseId}-input`}
        type="text"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded ? optionId(active) : undefined}
        autoComplete="off"
        placeholder="Search places"
        value={query}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Search results"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg"
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
            className={`flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
              i === active ? 'bg-blue-50' : ''
            }`}
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getTheme(place.theme).color }}
            />
            <span className="min-w-0">
              <span className="block truncate">{place.name}</span>
              <span className="block truncate text-xs text-neutral-600">
                {categoryLabel[place.category]} · {place.municipality}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {showEmpty && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-600 shadow-lg">
          <p>{emptyMessage}</p>
          {status === 'error' && (
            <button
              type="button"
              onClick={retry}
              className="mt-2 min-h-11 rounded-lg border border-neutral-400 bg-white px-4 text-sm font-medium text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
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
