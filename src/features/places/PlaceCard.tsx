// Detail card for one place: name, theme, location, description, sources and a close button.
import type { Place } from '../../types/place'
import { getTheme } from '../themes/themes'

interface PlaceCardProps {
  place: Place
  onClose: () => void
}

export function PlaceCard({ place, onClose }: PlaceCardProps) {
  const theme = getTheme(place.theme)
  const isSample = place.sourceIds.includes('sample')
  const location = [place.town, place.county].filter(Boolean).join(' · ')

  return (
    <article aria-labelledby={`place-${place.id}-name`} className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h2 id={`place-${place.id}-name`} className="text-lg leading-snug font-semibold">
          {place.name}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mt-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-2.5 py-1">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: theme.color }}
          />
          {theme.label}
        </span>
        {isSample && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900">
            Sample data
          </span>
        )}
      </div>

      {location && <p className="text-sm text-neutral-600">{location}</p>}
      {place.description && <p className="text-sm text-neutral-800">{place.description}</p>}
      <p className="text-xs text-neutral-500">
        Source: {isSample ? 'sample data' : place.sourceIds.join(', ')}
      </p>
    </article>
  )
}
