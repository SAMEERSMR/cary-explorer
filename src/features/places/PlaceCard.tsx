// Detail card for one place: name, category and theme, location, description, address, sources and a close button.
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Place } from '../../types/place'
import { categoryLabel, getTheme } from '../themes/themes'
import { publicUrl } from './catalog'
import {
  MAP_SELECTOR,
  SEARCH_SELECTOR,
  captureFocusOrigin,
  chooseFocusTarget,
} from './focusReturn'
import { usePlaces } from './usePlaces'

interface PlaceCardProps {
  place: Place
  onClose: () => void
}

const longDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' })

// Catalog dates are often day-only (e.g. 2026-11-02), so they are formatted in UTC to avoid a one-day shift.
function formatRetrieved(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : longDate.format(date)
}

export function PlaceCard({ place, onClose }: PlaceCardProps) {
  const theme = getTheme(place.theme)
  const { sources } = usePlaces()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const isSample = place.sourceIds.includes('sample')
  const location = [place.municipality, place.county].filter(Boolean).join(' · ')
  // Hide the category label when it repeats the theme chip (e.g. "History" / "History").
  const categoryName = categoryLabel[place.category]
  const showCategory = categoryName.toLowerCase() !== theme.label.toLowerCase()

  // Remember what had focus when this place became selected (before the heading takes it).
  // PanelBody keys the card by place id, so this runs once per selection, before the heading takes focus.
  const [origin] = useState(captureFocusOrigin)

  // Move focus to the name whenever a place is selected so keyboard and screen reader users land on the card.
  useEffect(() => {
    headingRef.current?.focus()
  }, [place.id])

  function handleClose() {
    const { element, rowPlaceId, fromMap } = origin
    const target = chooseFocusTarget({
      rememberedConnected: element?.isConnected ?? false,
      rememberedWasListRow: rowPlaceId !== null,
      fromMap,
    })
    onClose()
    // The card unmounts once the selection clears, so move focus explicitly.
    if (target === 'remembered') element?.focus()
    else if (target === 'row' && rowPlaceId !== null) {
      // The row is not rendered in map view: go back to the list, then focus the row after it renders.
      useAppStore.getState().setView('list')
      requestAnimationFrame(() => {
        const row = document.querySelector<HTMLElement>(
          `[data-place-id="${CSS.escape(rowPlaceId)}"]`,
        )
        ;(row ?? document.querySelector<HTMLElement>(SEARCH_SELECTOR))?.focus()
      })
    } else if (target === 'map') document.querySelector<HTMLElement>(MAP_SELECTOR)?.focus()
    else document.querySelector<HTMLElement>(SEARCH_SELECTOR)?.focus()
  }

  return (
    <article aria-labelledby={`place-${place.id}-name`} className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h2
          id={`place-${place.id}-name`}
          ref={headingRef}
          tabIndex={-1}
          className="text-lg leading-snug font-semibold"
        >
          {place.name}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={handleClose}
          className="-mt-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-500 px-2.5 py-1">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: theme.color }}
          />
          {theme.label}
        </span>
        {showCategory && <span className="font-medium text-neutral-800">{categoryName}</span>}
        {isSample && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900">
            Sample data
          </span>
        )}
      </div>

      {location && <p className="text-sm text-neutral-600">{location}</p>}
      <p className="text-sm text-neutral-800">
        {place.description || 'A description has not been added yet.'}
      </p>
      <div className="text-sm text-neutral-800">
        <p>{place.address || 'Visitor address has not been verified.'}</p>
        {place.stationNumber !== undefined && <p>Station {place.stationNumber}</p>}
      </div>
      <p className="text-sm text-neutral-600">
        Map pin is a representative location; check the source for entrances and access.
      </p>

      <section
        aria-labelledby={`place-${place.id}-sources`}
        className="space-y-2 border-t border-neutral-200 pt-3"
      >
        <h3 id={`place-${place.id}-sources`} className="text-sm font-semibold">
          Sources
        </h3>
        <ul className="space-y-3 text-sm">
          {place.sourceIds.map((id) => {
            const source = sources.find((s) => s.id === id)
            if (!source) return <li key={id}>{id}</li>
            return (
              <li key={id}>
                {publicUrl(source.url) ? (
                  <a
                    href={source.url}
                    className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
                  >
                    {source.name}
                  </a>
                ) : (
                  <span className="font-medium">{source.name}</span>
                )}
                {source.retrievedAt && (
                  <p className="text-neutral-600">
                    Retrieved{' '}
                    <time dateTime={source.retrievedAt}>{formatRetrieved(source.retrievedAt)}</time>
                  </p>
                )}
                {source.license && <p className="text-neutral-600">Licence: {source.license}</p>}
              </li>
            )
          })}
        </ul>
      </section>
    </article>
  )
}
