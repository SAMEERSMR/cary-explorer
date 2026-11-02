// Places restricted to the currently active theme filters (shared by map, search and list).
import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { usePlaces } from './usePlaces'

export function useFilteredPlaces() {
  const { places, status, retry } = usePlaces()
  const activeThemes = useAppStore((s) => s.activeThemes)
  const filtered = useMemo(
    () => places.filter((p) => activeThemes.includes(p.theme)),
    [places, activeThemes],
  )
  return useMemo(() => ({ places: filtered, status, retry }), [filtered, status, retry])
}
