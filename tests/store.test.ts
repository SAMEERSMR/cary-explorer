import { beforeEach, describe, expect, it } from 'vitest'
import { chooseFocusTarget } from '../src/features/places/focusReturn'
import { useAppStore } from '../src/store/useAppStore'

beforeEach(() => {
  useAppStore.setState({ selectedPlaceId: null, view: 'map', sheetState: 'peek' })
})

describe('view switching keeps the selection', () => {
  it("setView('list') keeps selectedPlaceId", () => {
    useAppStore.getState().setSelectedPlaceId('p1')
    useAppStore.getState().setView('list')
    expect(useAppStore.getState().view).toBe('list')
    expect(useAppStore.getState().selectedPlaceId).toBe('p1')
  })

  it("setView('map') after list still has the selection", () => {
    useAppStore.getState().setSelectedPlaceId('p1')
    useAppStore.getState().setView('list')
    useAppStore.getState().setView('map')
    expect(useAppStore.getState().selectedPlaceId).toBe('p1')
  })

  it('list opens the sheet full and map brings full back to half', () => {
    useAppStore.getState().setView('list')
    expect(useAppStore.getState().sheetState).toBe('full')
    useAppStore.getState().setView('map')
    expect(useAppStore.getState().sheetState).toBe('half')
  })
})

describe('chooseFocusTarget', () => {
  const base = { rememberedConnected: false, rememberedWasListRow: false, fromMap: false }
  it('returns to the remembered element while it is in the document', () => {
    expect(chooseFocusTarget({ ...base, rememberedConnected: true })).toBe('remembered')
  })
  it('goes back to the list row when the row was unmounted', () => {
    expect(chooseFocusTarget({ ...base, rememberedWasListRow: true })).toBe('row')
  })
  it('focuses the map when the selection came from the map', () => {
    expect(chooseFocusTarget({ ...base, fromMap: true })).toBe('map')
  })
  it('falls back to search otherwise', () => {
    expect(chooseFocusTarget(base)).toBe('search')
  })
})
