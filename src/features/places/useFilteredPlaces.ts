// Places restricted to the active theme, layer and town selection (the one filter shared by map, search and list).
import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { filterByLayers, resolveLayers, type LayerId } from '../themes/layerSelection'
import { filterPlaces } from '../towns/coverage'
import { filterByAmenities } from './amenities'
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
  const amenities = useAppStore((s) => s.amenityFilters)
  const layers = useLayerSelection()
  const beforeAmenities = useMemo(
    () => filterByLayers(filterPlaces(places, activeThemes, town), layers),
    [places, activeThemes, town, layers],
  )
  const filtered = useMemo(() => filterByAmenities(beforeAmenities, amenities), [beforeAmenities, amenities])
  // `amenityEmpty`: the amenity filters alone are why nothing is shown.
  const amenityEmpty = amenities.length > 0 && filtered.length === 0 && beforeAmenities.length > 0
  return useMemo(
    () => ({ places: filtered, layers, status, retry, amenityEmpty }),
    [filtered, layers, status, retry, amenityEmpty],
  )
}
