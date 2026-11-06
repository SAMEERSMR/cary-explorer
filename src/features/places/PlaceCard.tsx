// Detail card for one place: name, category and theme, location, description, address, sources and a close button.
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Place } from '../../types/place'
import { CategoryIcon } from '../themes/CategoryIcon'
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
  const location = [place.municipality, place.county].filter(Boolean).join(', ')
  // Hide the category label when it repeats the theme chip (e.g. "History" / "History").
  const categoryName = categoryLabel[place.category]
  const showCategory = categoryName.toLowerCase() !== theme.label.toLowerCase()
  const meta = [showCategory ? categoryName : null, location].filter(Boolean).join(' · ')

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
    <article
      aria-labelledby={`place-${place.id}-name`}
      className="overflow-hidden rounded-card border border-line bg-white"
    >
      <div
        aria-hidden="true"
        className="flex h-[120px] items-center justify-center"
        style={{ backgroundColor: theme.tint }}
      >
        <CategoryIcon category={place.category} size={44} color={theme.color} strokeWidth={1.6} />
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2
            id={`place-${place.id}-name`}
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-[26px] leading-tight font-semibold text-ink"
          >
            {place.name}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-edge bg-white text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-edge px-3 py-1 font-medium text-ink">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: theme.color }}
            />
            {theme.label}
          </span>
          {meta && <span className="text-ink-muted">{meta}</span>}
          {isSample && (
            <span className="rounded-full bg-sample-bg px-2.5 py-1 text-xs font-semibold text-sample-ink">
              Sample data
            </span>
          )}
        </div>

        <p className="text-[15px] leading-[1.55] text-ink-soft">
          {place.description || 'A description has not been added yet.'}
        </p>

        <section aria-labelledby={`place-${place.id}-visit`} className="space-y-2">
          <h3
            id={`place-${place.id}-visit`}
            className="text-xs font-semibold tracking-wide text-ink-muted uppercase"
          >
            Visit
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[14px]">
            <div className="min-w-0">
              <dt className="text-xs text-ink-muted">Address</dt>
              <dd className="text-ink">{place.address || 'Not verified yet'}</dd>
            </div>
            {place.stationNumber !== undefined && (
              <div>
                <dt className="text-xs text-ink-muted">Station</dt>
                <dd className="text-ink">{place.stationNumber}</dd>
              </div>
            )}
          </dl>
        </section>

        <div className="space-y-4 border-t border-line pt-4 text-[13px] text-ink-muted">
          <p>Map pin is a representative location; check the source for entrances and access.</p>

          <section aria-labelledby={`place-${place.id}-sources`} className="space-y-2">
            <h3
              id={`place-${place.id}-sources`}
              className="text-xs font-semibold tracking-wide uppercase"
            >
              Sources
            </h3>
            <ul className="space-y-3">
              {place.sourceIds.map((id) => {
                const source = sources.find((s) => s.id === id)
                if (!source) return <li key={id}>{id}</li>
                return (
                  <li key={id}>
                    {publicUrl(source.url) ? (
                      <a
                        href={source.url}
                        className="font-medium text-link underline underline-offset-2 hover:text-ink"
                      >
                        {source.name}
                      </a>
                    ) : (
                      <span className="font-medium text-ink">{source.name}</span>
                    )}
                    {source.retrievedAt && (
                      <p>
                        Retrieved{' '}
                        <time dateTime={source.retrievedAt}>{formatRetrieved(source.retrievedAt)}</time>
                      </p>
                    )}
                    {source.license && <p>Licence: {source.license}</p>}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>
    </article>
  )
}
