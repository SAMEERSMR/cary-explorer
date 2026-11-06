// Detail card for one place: name, category and theme, location, description, address, sources and a close button.
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Place } from '../../types/place'
import { CategoryBadge } from '../themes/CategoryIcon'
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
    // preventScroll: on phones the sheet is still growing, so a scrolling focus would leave the card cut off.
    // Instead the card's scroll area starts at the top, so the band and name are visible.
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 })
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
      className="overflow-hidden rounded-card border border-line bg-white shadow-sm"
    >
      <div className="relative h-24" style={{ backgroundColor: theme.tint }}>
        <div aria-hidden="true" className="flex h-full items-center justify-center">
          <CategoryBadge category={place.category} color={theme.color} size="md" />
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={handleClose}
          className="absolute top-2 right-2 inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-sm">
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 24 24"
              width={20}
              height={20}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </span>
        </button>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="inline-flex h-7 items-center gap-2 rounded-full px-3 font-semibold text-ink" style={{ backgroundColor: theme.tint }}>
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: theme.color }}
              />
              {theme.label}
            </span>
            {isSample && (
              <span className="rounded-lg bg-sample-bg px-2 py-1 text-xs font-semibold text-sample-ink">
                Sample data
              </span>
            )}
          </div>
          <h2
            id={`place-${place.id}-name`}
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-[26px] leading-tight font-semibold text-ink"
          >
            {place.name}
          </h2>
          {meta && <p className="text-[13px] leading-snug text-ink-muted">{meta}</p>}
        </div>

        <p className="text-[15px] leading-relaxed text-ink-soft">
          {place.description || 'A description has not been added yet.'}
        </p>

        <section aria-labelledby={`place-${place.id}-visit`} className="space-y-2">
          <h3
            id={`place-${place.id}-visit`}
            className="text-xs font-semibold tracking-wide text-ink-muted uppercase"
          >
            Visit
          </h3>
          <dl className="border-t border-line">
            <div className="grid grid-cols-[16px_96px_1fr] items-center gap-3 border-b border-line py-3">
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 24 24"
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-ink-muted"
              >
                <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
              </svg>
              <dt className="text-[13px] text-ink-muted">Address</dt>
              <dd className="min-w-0 text-[14px] text-ink">{place.address || 'Not verified yet'}</dd>
            </div>
            {place.stationNumber !== undefined && (
              <div className="grid grid-cols-[16px_96px_1fr] items-center gap-3 border-b border-line py-3">
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                  width={16}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-ink-muted"
                >
                  <path d="M4 9h16 M4 15h16 M10 3L8 21 M16 3l-2 18" />
                </svg>
                <dt className="text-[13px] text-ink-muted">Station</dt>
                <dd className="min-w-0 text-[14px] text-ink">{place.stationNumber}</dd>
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
