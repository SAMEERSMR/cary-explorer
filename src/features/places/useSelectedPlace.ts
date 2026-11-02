// Resolves the selected place id from the store to its Place object.
import { useAppStore } from '../../store/useAppStore'
import { usePlaces } from './usePlaces'

export function useSelectedPlace() {
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId)
  const { places } = usePlaces()
  return places.find((p) => p.id === selectedPlaceId) ?? null
}
