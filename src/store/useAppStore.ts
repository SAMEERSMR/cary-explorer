// Zustand store for global UI state: selection, theme filters, search query, view mode and mobile sheet state.
import { create } from 'zustand'
import type { ThemeId } from '../types/place'
import { THEMES } from '../features/themes/themes'

export type ViewMode = 'map' | 'list'
export type SheetState = 'peek' | 'half' | 'full'

interface AppState {
  selectedPlaceId: string | null
  activeThemes: ThemeId[]
  searchQuery: string
  view: ViewMode
  sheetState: SheetState
  // Desktop side panel hidden. Transient UI state: deliberately not part of the shareable URL state.
  panelCollapsed: boolean
  setSelectedPlaceId: (id: string | null) => void
  setActiveThemes: (themes: ThemeId[]) => void
  toggleTheme: (id: ThemeId) => void
  setSearchQuery: (query: string) => void
  setView: (view: ViewMode) => void
  setSheetState: (state: SheetState) => void
  setPanelCollapsed: (collapsed: boolean) => void
  togglePanel: () => void
}

export const useAppStore = create<AppState>()((set) => ({
  selectedPlaceId: null,
  activeThemes: THEMES.map((t) => t.id),
  searchQuery: '',
  view: 'map',
  sheetState: 'peek',
  panelCollapsed: false,
  setSelectedPlaceId: (id) =>
    set((s) => ({
      selectedPlaceId: id,
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
