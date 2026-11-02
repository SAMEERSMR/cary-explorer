// One shared search index per catalog: SearchBox and ListView get the same function until the places array changes.
import type { Place } from '../../types/place'
import { usePlaces } from '../places/usePlaces'
import { createPlaceSearch, type PlaceSearch } from './searchIndex'

const cache = new WeakMap<readonly Place[], PlaceSearch>()

export function getSharedPlaceSearch(places: readonly Place[]): PlaceSearch {
  let search = cache.get(places)
  if (!search) {
    search = createPlaceSearch(places)
    cache.set(places, search)
  }
  return search
}

export function usePlaceSearch(): PlaceSearch {
  const { places } = usePlaces()
  return getSharedPlaceSearch(places)
}
