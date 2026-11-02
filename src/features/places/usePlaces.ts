// Loads the places catalogue once (module-level cache) and exposes it with a loading status.
import { useEffect, useState } from 'react'
import type { Place } from '../../types/place'

// Swap this URL for the real catalogue when it exists.
const PLACES_URL = '/data/sample-places.json'

type Status = 'loading' | 'ready' | 'error'
interface PlacesState {
  places: Place[]
  status: Status
}

const NO_PLACES: Place[] = []
let loaded: Place[] | null = null
let request: Promise<Place[]> | null = null

function loadPlaces(): Promise<Place[]> {
  request ??= fetch(PLACES_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load places: ${res.status}`)
      return res.json() as Promise<Place[]>
    })
    .then((places) => {
      loaded = places
      return places
    })
    .catch((err) => {
      request = null
      throw err
    })
  return request
}

export function usePlaces(): PlacesState {
  const [state, setState] = useState<PlacesState>(
    loaded ? { places: loaded, status: 'ready' } : { places: NO_PLACES, status: 'loading' },
  )

  useEffect(() => {
    if (loaded) return
    let cancelled = false
    loadPlaces()
      .then((places) => !cancelled && setState({ places, status: 'ready' }))
      .catch(() => !cancelled && setState({ places: NO_PLACES, status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
