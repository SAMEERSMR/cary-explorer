// Places restricted to the currently active theme and town filters (shared by map, search and list).
import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { filterPlaces } from '../towns/coverage'
import { usePlaces } from './usePlaces'

export function useFilteredPlaces() {
  const { places, status, retry } = usePlaces()
  const activeThemes = useAppStore((s) => s.activeThemes)
  const town = useAppStore((s) => s.town)
  const filtered = useMemo(
    () => filterPlaces(places, activeThemes, town),
    [places, activeThemes, town],
  )
  return useMemo(() => ({ places: filtered, status, retry }), [filtered, status, retry])
}
