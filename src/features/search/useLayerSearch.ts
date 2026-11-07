// Search through the same selection as the map: active themes, switched-on layers and the town.
// Search does NOT look into switched-off layers; when that leaves nothing, `hiddenLayers` names the layers that hold matches.
import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import type { Place } from '../../types/place'
import { useLayerSelection } from '../places/useFilteredPlaces'
import { hiddenCategories, layersHidingPlaces, selectedCategories, type LayerId } from '../themes/layerSelection'
import { townBySlug } from '../towns/coverage'
import { usePlaceSearch } from './usePlaceSearch'

export function useLayerSearch(query: string, limit: number, skipEmptyQuery = false): { results: Place[]; hiddenLayers: LayerId[] } {
  const search = usePlaceSearch()
  const themes = useAppStore((s) => s.activeThemes)
  const town = useAppStore((s) => s.town)
  const layers = useLayerSelection()
  return useMemo(() => {
    if (skipEmptyQuery && !query.trim()) return { results: [], hiddenLayers: [] }
    const municipality = townBySlug(town)?.label
    const results = search(query, { themes, categories: selectedCategories(layers), municipality }, limit)
    if (results.length > 0) return { results, hiddenLayers: [] }
    const hidden = search(query, { themes, categories: hiddenCategories(themes, layers), municipality }, Infinity)
    return { results, hiddenLayers: layersHidingPlaces(hidden, themes, layers) }
  }, [search, query, limit, skipEmptyQuery, themes, town, layers])
}
