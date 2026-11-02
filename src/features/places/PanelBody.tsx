// Panel content shared by desktop and mobile: the place card, the list view, or a hint.
import { useAppStore } from '../../store/useAppStore'
import { ListView } from './ListView'
import { PlaceCard } from './PlaceCard'
import { useSelectedPlace } from './useSelectedPlace'

export function PanelBody() {
  const selected = useSelectedPlace()
  const view = useAppStore((s) => s.view)
  const setSelectedPlaceId = useAppStore((s) => s.setSelectedPlaceId)

  if (selected) return <PlaceCard place={selected} onClose={() => setSelectedPlaceId(null)} />
  if (view === 'list') return <ListView />
  return <p className="text-sm text-neutral-600">Select a place on the map or search</p>
}
