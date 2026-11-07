// Panel content shared by desktop and mobile: the place card, the list view, or a hint.
import { useAppStore } from '../../store/useAppStore'
import { ListView } from './ListView'
import { PlaceCard } from './PlaceCard'
import { useSelectedPlace } from './useSelectedPlace'

function MissingPlaceNote() {
  const missing = useAppStore((s) => s.missingPlaceId)
  const dismiss = useAppStore((s) => s.dismissMissingPlace)
  if (!missing) return null
  return (
    <div role="status" className="mb-3 flex items-center justify-between gap-3 rounded-card border border-line bg-subtle p-3 text-sm text-ink">
      <p>That place isn&apos;t in the current data.</p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 font-medium text-link underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-link"
      >
        Dismiss
      </button>
    </div>
  )
}

export function PanelBody() {
  const selected = useSelectedPlace()
  const view = useAppStore((s) => s.view)
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId)

  // The list view shows the list even when a place is selected (its row is highlighted); the card shows in map view.
  if (view === 'list') {
    return (
      <>
        <MissingPlaceNote />
        <ListView />
      </>
    )
  }
  if (selected) return <PlaceCard key={selected.id} place={selected} onClose={() => setSelectedPlaceId(null)} />
  return (
    <>
      <MissingPlaceNote />
      <div className="rounded-card border border-dashed border-placeholder-line bg-white p-5">
      <p className="font-display text-xl font-semibold text-ink">Pick a place to start</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        Tap a pin on the map, search by name, or switch to the list.
      </p>
      </div>
    </>
  )
}
