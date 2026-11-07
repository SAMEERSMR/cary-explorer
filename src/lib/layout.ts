// Shared layout sizes: the desktop side panel width, used by the panel itself and by the map's padding and offsets.
export const DESKTOP_PANEL_WIDTH = 400
// DOM id of the desktop side panel, referenced by the collapse / show buttons via aria-controls.
export const DESKTOP_PANEL_ID = 'desktop-panel'

// Desktop map padding [top, right, bottom, left] for fitting a selection: clear of the panel only while it is open.
export function desktopSelectionPadding(panelCollapsed: boolean): [number, number, number, number] {
  return [40, 40, 40, panelCollapsed ? 40 : DESKTOP_PANEL_WIDTH + 40]
}
