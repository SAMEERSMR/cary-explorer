// Zustand store for global UI state: the selected place and active theme filters.
import { create } from 'zustand'
import type { ThemeId } from '../types/place'

interface AppState {
  selectedPlaceId: string | null
  activeThemes: ThemeId[]
  setSelectedPlaceId: (id: string | null) => void
  setActiveThemes: (themes: ThemeId[]) => void
}

export const useAppStore = create<AppState>()((set) => ({
  selectedPlaceId: null,
  activeThemes: [],
  setSelectedPlaceId: (id) => set({ selectedPlaceId: id }),
  setActiveThemes: (themes) => set({ activeThemes: themes }),
}))
