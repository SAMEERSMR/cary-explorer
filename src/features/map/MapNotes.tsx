// Status notes laid over the map: loading, catalog error, empty states and map-unavailable.
// The wrapper never captures pointer events, so only the notes themselves are clickable.
import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { useFilteredPlaces } from '../places/useFilteredPlaces'
import { usePlaces } from '../places/usePlaces'
import { THEMES } from '../themes/themes'
import { useMapStatus } from './mapStatus'

const cardClass =
  'pointer-events-auto w-full max-w-sm rounded-card border border-line bg-white p-4 text-ink shadow-md'
const titleClass = 'font-display text-[18px] font-semibold leading-snug'
const bodyClass = 'mt-1 text-sm leading-relaxed text-ink-muted'
const primaryButton =
  'min-h-11 rounded-control bg-forest px-4 text-sm font-semibold text-white hover:bg-ink-soft'
const linkButton = 'min-h-11 rounded-control px-3 text-sm font-semibold text-link underline underline-offset-2'

function Card({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className={cardClass}>
      <p className={titleClass}>{title}</p>
      <p className={bodyClass}>{body}</p>
      {children}
    </div>
  )
}

export function MapNotes() {
  const isDesktop = useIsDesktop()
  const { status, error, retry } = usePlaces()
  const { places: visible } = useFilteredPlaces()
  const noThemes = useAppStore((s) => s.activeThemes.length === 0)
  const mapStatus = useMapStatus()
  const [showDetails, setShowDetails] = useState(false)

  let catalogNote: React.ReactNode = null
  if (status === 'error') {
    catalogNote = (
      <Card
        title="We couldn't load the places"
        body="Check your connection, then try again. Anything already loaded stays on the map."
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={retry} className={primaryButton}>
            Try again
          </button>
          <button
            type="button"
            aria-expanded={showDetails}
            onClick={() => setShowDetails((v) => !v)}
            className={linkButton}
          >
            Details
          </button>
        </div>
        {showDetails && (
          <p className="mt-2 break-words rounded-control bg-subtle p-2 font-mono text-xs text-ink-soft">
            {error || 'No further details were reported.'}
          </p>
        )}
      </Card>
    )
  } else if (status === 'loading') {
    catalogNote = (
      <p className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-md">
        <span className="cary-spinner" aria-hidden="true" />
        Loading places…
      </p>
    )
  } else if (noThemes) {
    catalogNote = (
      <Card title="Nothing to show yet" body="Turn on a theme to see places on the map and in the list.">
        <button
          type="button"
          onClick={() => useAppStore.getState().setActiveThemes(THEMES.map((t) => t.id))}
          className={`${primaryButton} mt-3`}
        >
          Turn on all themes
        </button>
      </Card>
    )
  } else if (visible.length === 0) {
    catalogNote = <p className={`${cardClass} text-sm`}>No places to show</p>
  }

  const mapNote =
    mapStatus.state === 'unavailable' ? (
      <Card
        title="The map isn't available right now"
        body="You can still search and browse every place in the list."
      >
        <button
          type="button"
          onClick={() => {
            const s = useAppStore.getState()
            s.setView('list')
            if (!isDesktop) s.setSheetState('full')
          }}
          className={`${primaryButton} mt-3`}
        >
          Open the list
        </button>
      </Card>
    ) : null

  // Desktop: the visible map is right of the 380px side panel. Mobile: below the search bar and chips (~128px).
  const position = isDesktop ? 'left-[396px] right-4 top-4' : 'inset-x-4 top-[128px]'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute z-10 flex flex-col items-center gap-2 ${position}`}
    >
      {mapNote}
      {catalogNote}
    </div>
  )
}
