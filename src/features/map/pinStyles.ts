// Pure, cached OpenLayers styles for map pins and clusters. Pins are SVG data-URL icons so they
// can carry a ring, a soft shadow and the category's white stroke icon.
import { Fill, Icon, Stroke, Style, Text } from 'ol/style'
import CircleStyle from 'ol/style/Circle'
import type { CategoryId, ThemeId } from '../../types/place'
import { CATEGORY_ICON } from '../themes/icons'
import { getTheme } from '../themes/themes'

export type PinState = 'default' | 'hover' | 'selected'

const INK = '#1F2A24'
const FOREST = '#2F6B4F'
const FONT = '600 13px "Inter Variable", Inter, system-ui, sans-serif'

// Diameters in px, including the white ring (and the ink ring for the selected pin).
export const PIN_SIZE = { default: 36, hover: 36, selected: 48 } as const
const ICON_SIZE = { default: 18, hover: 18, selected: 24 } as const
// Transparent margin around the circle for the shadow and the hover halo.
const PAD = 12
const LABEL_OFFSET_Y = 24 + 15

export const CLUSTER_SIZE = 44
export const SELECTED_Z_INDEX = 1000

/** SVG markup for one pin. Exported for tests; the icon path comes from CATEGORY_ICON. */
export function buildPinSvg(category: CategoryId, color: string, state: PinState): string {
  const d = PIN_SIZE[state]
  const box = d + PAD * 2
  const c = box / 2
  const r = d / 2
  const iconPx = ICON_SIZE[state]
  const iconScale = iconPx / 24
  const iconOffset = c - iconPx / 2
  let rings: string
  if (state === 'selected') {
    // Outer 3px ink ring, then 3px white ring, then the theme colour.
    rings =
      `<circle cx="${c}" cy="${c}" r="${r - 1.5}" fill="${color}" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="${c}" cy="${c}" r="${r - 4.5}" fill="${color}" stroke="#ffffff" stroke-width="3"/>`
  } else {
    rings = `<circle cx="${c}" cy="${c}" r="${r - 1}" fill="${color}" stroke="#ffffff" stroke-width="2"/>`
  }
  const halo =
    state === 'hover' ? `<circle cx="${c}" cy="${c}" r="${r + 7}" fill="${color}" fill-opacity="0.25"/>` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${box}" height="${box}" viewBox="0 0 ${box} ${box}">` +
    `<defs><filter id="s" x="-30%" y="-30%" width="160%" height="170%">` +
    `<feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#1F2A24" flood-opacity="0.3"/></filter></defs>` +
    halo +
    `<g filter="url(#s)">${rings}</g>` +
    `<g transform="translate(${iconOffset} ${iconOffset}) scale(${iconScale})" fill="none" stroke="#ffffff" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${CATEGORY_ICON[category]}"/></g>` +
    `</svg>`
  )
}

export function pinDataUrl(category: CategoryId, color: string, state: PinState): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildPinSvg(category, color, state))}`
}

/** Cache key. The name only matters for the selected pin, whose label shows it. */
export function pinKey(category: CategoryId, theme: ThemeId, state: PinState, name = ''): string {
  return state === 'selected' ? `${category}|${theme}|${state}|${name}` : `${category}|${theme}|${state}`
}

const pinCache = new Map<string, Style>()
const clusterCache = new Map<number, Style[]>()

/** Style for one pin. Same arguments return the same Style object. */
export function getPinStyle(category: CategoryId, theme: ThemeId, state: PinState, name = ''): Style {
  const key = pinKey(category, theme, state, name)
  const hit = pinCache.get(key)
  if (hit) return hit

  if (state === 'selected') {
    // Only one pin is selected at a time, so drop older labelled styles.
    for (const k of pinCache.keys()) if (k.includes('|selected|')) pinCache.delete(k)
  }

  const style = new Style({
    image: new Icon({
      src: pinDataUrl(category, getTheme(theme).color, state),
      anchor: [0.5, 0.5],
    }),
    text:
      state === 'selected' && name
        ? new Text({
            text: name,
            font: FONT,
            fill: new Fill({ color: '#ffffff' }),
            backgroundFill: new Fill({ color: INK }),
            // The round-joined stroke rounds the pill's corners; padding is reduced to compensate.
            backgroundStroke: new Stroke({ color: INK, width: 8, lineJoin: 'round' }),
            padding: [1, 7, 1, 7],
            offsetY: LABEL_OFFSET_Y,
            textAlign: 'center',
            textBaseline: 'middle',
          })
        : undefined,
    zIndex: state === 'selected' ? SELECTED_Z_INDEX : state === 'hover' ? 2 : 1,
  })
  pinCache.set(key, style)
  return style
}

/** Styles for a cluster of `count` places (count > 1): forest halo, white-ringed disc and the count. */
export function getClusterStyle(count: number): Style[] {
  const hit = clusterCache.get(count)
  if (hit) return hit
  const styles = [
    new Style({
      image: new CircleStyle({ radius: CLUSTER_SIZE / 2 + 6, fill: new Fill({ color: 'rgba(47,107,79,0.22)' }) }),
      zIndex: 3,
    }),
    new Style({
      image: new CircleStyle({
        radius: CLUSTER_SIZE / 2 - 1.5,
        fill: new Fill({ color: FOREST }),
        stroke: new Stroke({ color: '#ffffff', width: 3 }),
      }),
      text: new Text({
        text: String(count),
        font: FONT.replace('13px', '15px'),
        fill: new Fill({ color: '#ffffff' }),
        textAlign: 'center',
        textBaseline: 'middle',
      }),
      zIndex: 4,
    }),
  ]
  clusterCache.set(count, styles)
  return styles
}
