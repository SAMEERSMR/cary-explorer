// Status notes laid over the map: loading, catalog error, empty states and map-unavailable.
// The wrapper never captures pointer events, so only the notes themselves are clickable.
import { useAppStore } from '../../store/useAppStore'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { useFilteredPlaces } from '../places/useFilteredPlaces'
import { usePlaces } from '../places/usePlaces'
import { MAP_UNAVAILABLE_MESSAGE, useMapStatus } from './mapStatus'

const noteClass =
  'pointer-events-auto max-w-sm rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-md'

export function MapNotes() {
  const isDesktop = useIsDesktop()
  const { status, error, retry } = usePlaces()
  const { places: visible } = useFilteredPlaces()
  const noThemes = useAppStore((s) => s.activeThemes.length === 0)
  const mapStatus = useMapStatus()

  let catalogNote: React.ReactNode = null
  if (status === 'error') {
    catalogNote = (
      <div className={noteClass}>
        <p>Couldn&apos;t load places{error ? `: ${error}` : '.'}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-2 min-h-11 rounded-lg border border-neutral-400 bg-white px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Try again
        </button>
      </div>
    )
  } else if (status === 'loading') {
    catalogNote = <p className={noteClass}>Loading places…</p>
  } else if (noThemes) {
    catalogNote = <p className={noteClass}>No themes selected</p>
  } else if (visible.length === 0) {
    catalogNote = <p className={noteClass}>No places to show</p>
  }

  // Desktop: clear of the 380px side panel. Mobile: below the search bar and chips (~120px).
  const position = isDesktop ? 'left-[396px] right-4 top-4' : 'inset-x-4 top-[128px]'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute z-10 flex flex-col items-start gap-2 ${position}`}
    >
      {mapStatus.state === 'unavailable' && <p className={noteClass}>{MAP_UNAVAILABLE_MESSAGE}</p>}
      {catalogNote}
    </div>
  )
}
