// Zustand store for global UI state: selection, theme filters, search query, view mode and mobile sheet state.
import { create } from 'zustand'
import type { ThemeId } from '../types/place'
import { THEMES } from '../features/themes/themes'

export type ViewMode = 'map' | 'list'
export type SheetState = 'peek' | 'half' | 'full'

export interface CameraRequest {
  center: [number, number]
  zoom: number
  seq: number
}
export interface FitRequest {
  seq: number
}
export interface UrlApply {
  themes?: ThemeId[]
  view?: ViewMode
  searchQuery?: string
  town?: string | null
  about?: boolean
  selectedPlaceId: string | null
  missingPlaceId?: string | null
  origin: SelectionOrigin
}
export type SelectionOrigin = 'user' | 'url'

interface AppState {
  selectedPlaceId: string | null
  activeThemes: ThemeId[]
  searchQuery: string
  // Town slug (see features/towns/coverage.ts); null = all towns.
  town: string | null
  view: ViewMode
  sheetState: SheetState
  // Desktop side panel hidden. Transient UI state: deliberately not part of the shareable URL state.
  panelCollapsed: boolean
  // Where the current selection came from. 'url' (set only when the URL also carries a camera) skips the fly-to.
  selectionOrigin: SelectionOrigin
  // A place id from the URL that is not in the catalog: the panel shows a "not found" note.
  missingPlaceId: string | null
  // Credits & privacy dialog open (URL `about=1`).
  aboutOpen: boolean
  openAbout: () => void
  closeAbout: () => void
  // One-shot camera move for the map (applied by `seq`, no animation).
  cameraRequest: CameraRequest | null
  // One-shot request to fit the map to the filtered places of the chosen town (applied by `seq`).
  fitRequest: FitRequest | null
  requestFit: () => void
  requestCamera: (center: [number, number], zoom: number) => void
  dismissMissingPlace: () => void
  applyUrlState: (apply: UrlApply) => void
  setSelectedPlaceId: (id: string | null) => void
  setActiveThemes: (themes: ThemeId[]) => void
  toggleTheme: (id: ThemeId) => void
  setSearchQuery: (query: string) => void
  setTown: (town: string | null) => void
  setView: (view: ViewMode) => void
  setSheetState: (state: SheetState) => void
  setPanelCollapsed: (collapsed: boolean) => void
  togglePanel: () => void
}

export const useAppStore = create<AppState>()((set) => ({
  selectedPlaceId: null,
  activeThemes: THEMES.map((t) => t.id),
  searchQuery: '',
  town: null,
  view: 'map',
  sheetState: 'peek',
  panelCollapsed: false,
  selectionOrigin: 'user',
  missingPlaceId: null,
  aboutOpen: false,
  openAbout: () => set({ aboutOpen: true }),
  closeAbout: () => set({ aboutOpen: false }),
  cameraRequest: null,
  fitRequest: null,
  requestFit: () => set((s) => ({ fitRequest: { seq: (s.fitRequest?.seq ?? 0) + 1 } })),
  requestCamera: (center, zoom) =>
    set((s) => ({ cameraRequest: { center, zoom, seq: (s.cameraRequest?.seq ?? 0) + 1 } })),
  dismissMissingPlace: () => set({ missingPlaceId: null }),
  applyUrlState: (a) =>
    set((s) => {
      const view = a.view ?? 'map'
      return {
        activeThemes: a.themes ?? THEMES.map((t) => t.id),
        searchQuery: a.searchQuery ?? '',
        town: a.town ?? null,
        aboutOpen: a.about ?? false,
        view,
        selectedPlaceId: a.selectedPlaceId,
        missingPlaceId: a.missingPlaceId ?? null,
        selectionOrigin: a.origin,
        panelCollapsed: a.selectedPlaceId !== null ? false : s.panelCollapsed,
        // Same sheet rules as user actions: list is full, a restored selection opens a peeking sheet at half.
        sheetState:
          view === 'list'
            ? 'full'
            : a.selectedPlaceId !== null && s.sheetState === 'peek'
              ? 'half'
              : s.sheetState === 'full'
                ? 'half'
                : s.sheetState,
      }
    }),
  setSelectedPlaceId: (id) =>
    set((s) => ({
      selectedPlaceId: id,
      selectionOrigin: 'user' as SelectionOrigin,
      missingPlaceId: null,
      // Selecting a place re-opens a collapsed desktop panel so its card is visible.
      panelCollapsed: id !== null ? false : s.panelCollapsed,
      sheetState: id !== null && s.sheetState === 'peek' ? 'half' : s.sheetState,
    })),
  setActiveThemes: (themes) => set({ activeThemes: themes }),
  toggleTheme: (id) =>
    set((s) => ({
      activeThemes: s.activeThemes.includes(id)
        ? s.activeThemes.filter((t) => t !== id)
        : [...s.activeThemes, id],
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  // Like themes, changing the town never clears the selection: the card stays even if the place is filtered out.
  // Choosing a town (not "all towns") also asks the map to fit its places.
  setTown: (town) =>
    set((s) => ({ town, fitRequest: town ? { seq: (s.fitRequest?.seq ?? 0) + 1 } : s.fitRequest })),
  // Switching views keeps the selection: the list highlights it and the map shows its card.
  setView: (view) =>
    set((s) => ({
      view,
      // On mobile the list lives in the sheet, so opening it shows it in full.
      sheetState: view === 'list' ? 'full' : s.sheetState === 'full' ? 'half' : s.sheetState,
    })),
  setSheetState: (sheetState) => set({ sheetState }),
  setPanelCollapsed: (panelCollapsed) => set({ panelCollapsed }),
  togglePanel: () => set((s) => ({ panelCollapsed: !s.panelCollapsed })),
}))
