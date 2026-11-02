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
  setSelectedPlaceId: (id: string | null) => void
  setActiveThemes: (themes: ThemeId[]) => void
  toggleTheme: (id: ThemeId) => void
  setSearchQuery: (query: string) => void
  setView: (view: ViewMode) => void
  setSheetState: (state: SheetState) => void
}

export const useAppStore = create<AppState>()((set) => ({
  selectedPlaceId: null,
  activeThemes: THEMES.map((t) => t.id),
  searchQuery: '',
  view: 'map',
  sheetState: 'peek',
  setSelectedPlaceId: (id) =>
    set((s) => ({
      selectedPlaceId: id,
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
  setView: (view) =>
    set((s) => ({
      view,
      // On mobile the list lives in the sheet, so opening it shows it in full.
      sheetState: view === 'list' ? 'full' : s.sheetState === 'full' ? 'half' : s.sheetState,
      selectedPlaceId: view === 'list' ? null : s.selectedPlaceId,
    })),
  setSheetState: (sheetState) => set({ sheetState }),
}))
