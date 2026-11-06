// Panel content shared by desktop and mobile: the place card, the list view, or a hint.
import { useAppStore } from '../../store/useAppStore'
import { ListView } from './ListView'
import { PlaceCard } from './PlaceCard'
import { useSelectedPlace } from './useSelectedPlace'

export function PanelBody() {
  const selected = useSelectedPlace()
  const view = useAppStore((s) => s.view)
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId)

  // The list view shows the list even when a place is selected (its row is highlighted); the card shows in map view.
  if (view === 'list') return <ListView />
  if (selected) return <PlaceCard key={selected.id} place={selected} onClose={() => setSelectedPlaceId(null)} />
  return (
    <div className="rounded-card border border-dashed border-placeholder-line p-5">
      <p className="font-display text-xl font-semibold text-ink">Pick a place to start</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        Tap a pin on the map, search by name, or switch to the list.
      </p>
    </div>
  )
}
