// Framework-free store that loads the catalog once and shares the same arrays with every consumer.
import type { Place, Source } from '../../types/place'
import { CATALOG_URL, loadCatalog, type Catalog } from './catalog'

export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface CatalogState {
  status: CatalogStatus
  places: Place[]
  sources: Source[]
  error?: string
}

export type CatalogLoader = (url: string, signal: AbortSignal) => Promise<Catalog>

export interface CatalogStore {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => CatalogState
  /** Starts the single shared load when idle; a no-op while loading, ready or failed (use retry). */
  ensureLoaded: () => void
  /** Starts a fresh load after a failure. */
  retry: () => void
}

const NO_PLACES: Place[] = []
const NO_SOURCES: Source[] = []
const IDLE: CatalogState = { status: 'idle', places: NO_PLACES, sources: NO_SOURCES }

const isAbort = (err: unknown) => err instanceof Error && err.name === 'AbortError'

export function createCatalogStore(load: CatalogLoader = loadCatalog): CatalogStore {
  let state: CatalogState = IDLE
  let controller: AbortController | null = null
  let subscriberCount = 0
  const listeners = new Set<() => void>()

  function set(next: CatalogState) {
    state = next
    listeners.forEach((listener) => listener())
  }

  function start() {
    const own = new AbortController()
    controller = own
    // Places and sources are dropped on loading/error; a successful load replaces them once.
    set({ status: 'loading', places: NO_PLACES, sources: NO_SOURCES })
    load(CATALOG_URL, own.signal).then(
      (catalog) => {
        if (controller !== own) return
        controller = null
        set({ status: 'ready', places: catalog.places, sources: catalog.sources })
      },
      (err: unknown) => {
        // Aborted or superseded loads must not touch the state.
        if (controller !== own || own.signal.aborted || isAbort(err)) return
        controller = null
        const error = err instanceof Error ? err.message : 'Could not load places.'
        set({ status: 'error', places: NO_PLACES, sources: NO_SOURCES, error })
      },
    )
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      subscriberCount += 1
      let subscribed = true
      return () => {
        if (!subscribed) return
        subscribed = false
        listeners.delete(listener)
        subscriberCount -= 1
        // Nobody is waiting any more: cancel the request so a later mount starts clean.
        if (subscriberCount === 0 && state.status === 'loading') {
          const pending = controller
          controller = null
          pending?.abort()
          set(IDLE)
        }
      }
    },
    getSnapshot: () => state,
    ensureLoaded() {
      if (state.status === 'idle') start()
    },
    retry() {
      if (state.status === 'error') start()
    },
  }
}

export const catalogStore = createCatalogStore()
