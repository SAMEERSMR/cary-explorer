// Places restricted to the active theme, layer and town selection (the one filter shared by map, search and list).
import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { filterByLayers, resolveLayers, type LayerId } from '../themes/layerSelection'
import { filterPlaces } from '../towns/coverage'
import { usePlaces } from './usePlaces'

/** The layers that are on, from the active themes and the user's switches. */
export function useLayerSelection(): LayerId[] {
  const activeThemes = useAppStore((s) => s.activeThemes)
  const overrides = useAppStore((s) => s.layerOverrides)
  return useMemo(() => resolveLayers(activeThemes, overrides), [activeThemes, overrides])
}

export function useFilteredPlaces() {
  const { places, status, retry } = usePlaces()
  const activeThemes = useAppStore((s) => s.activeThemes)
  const town = useAppStore((s) => s.town)
  const layers = useLayerSelection()
  const filtered = useMemo(
    () => filterByLayers(filterPlaces(places, activeThemes, town), layers),
    [places, activeThemes, town, layers],
  )
  return useMemo(() => ({ places: filtered, layers, status, retry }), [filtered, layers, status, retry])
}
