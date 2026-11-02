// Loads the validated places catalogue (module-level cache of the last success) with a loading status.
import { useCallback, useEffect, useState } from 'react'
import type { Place, Source } from '../../types/place'
import { CATALOG_URL, loadCatalog, type Catalog } from './catalog'

type Status = 'loading' | 'ready' | 'error'
interface PlacesState {
  places: Place[]
  sources: Source[]
  status: Status
  error?: string
}
export interface PlacesResult extends PlacesState {
  retry: () => void
}

const NO_PLACES: Place[] = []
const NO_SOURCES: Source[] = []
const LOADING: PlacesState = { places: NO_PLACES, sources: NO_SOURCES, status: 'loading' }

// Only a successful load is cached; failures and aborted loads are retried on the next mount.
let cached: PlacesState | null = null
const listeners = new Set<(state: PlacesState) => void>()

function remember(catalog: Catalog): PlacesState {
  cached = { places: catalog.places, sources: catalog.sources, status: 'ready' }
  // Let every mounted hook (e.g. map and list) recover when any one of them succeeds.
  listeners.forEach((notify) => notify(cached as PlacesState))
  return cached
}

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError'

export function usePlaces(): PlacesResult {
  const [state, setState] = useState<PlacesState>(cached ?? LOADING)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  useEffect(() => {
    if (cached) return
    const controller = new AbortController()
    loadCatalog(CATALOG_URL, controller.signal)
      .then((catalog) => {
        if (!controller.signal.aborted) remember(catalog)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbort(err)) return
        const error = err instanceof Error ? err.message : 'Could not load places.'
        setState({ places: NO_PLACES, sources: NO_SOURCES, status: 'error', error })
      })
    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => {
    setState(LOADING)
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
