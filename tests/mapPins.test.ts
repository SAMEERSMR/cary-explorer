import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  buildPinSvg,
  getClusterStyle,
  getPinStyle,
  pinKey,
} from '../src/features/map/pinStyles'
import { CATEGORY_ICON } from '../src/features/themes/icons'

describe('pin styles', () => {
  // OpenLayers' Icon creates an Image; Node has none, so give it an inert stand-in.
  beforeAll(() => {
    vi.stubGlobal(
      'Image',
      class {
        addEventListener() {}
        removeEventListener() {}
        decode() {
          return new Promise(() => {})
        }
      },
    )
  })

  it('returns the same style object for the same key', () => {
    expect(getPinStyle('park', 'parks-trails', 'default')).toBe(getPinStyle('park', 'parks-trails', 'default'))
    expect(getClusterStyle(7)).toBe(getClusterStyle(7))
  })

  it('keys differ by category, theme and state', () => {
    const keys = [
      pinKey('park', 'parks-trails', 'default'),
      pinKey('trail', 'parks-trails', 'default'),
      pinKey('park', 'water', 'default'),
      pinKey('park', 'parks-trails', 'hover'),
      pinKey('park', 'parks-trails', 'selected', 'A'),
    ]
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('selected differs from default: larger, on top, and labelled with the name', () => {
    const base = getPinStyle('history', 'history', 'default')
    const sel = getPinStyle('history', 'history', 'selected', 'Page-Walker Hotel')
    expect(sel).not.toBe(base)
    expect(sel.getZIndex()).toBeGreaterThan(base.getZIndex() ?? 0)
    expect(sel.getText()?.getText()).toBe('Page-Walker Hotel')
    expect(base.getText()).toBeNull()
    expect(buildPinSvg('history', '#9A4A2E', 'selected')).toContain('width="72"')
    expect(buildPinSvg('history', '#9A4A2E', 'default')).toContain('width="60"')
  })

  it('svg carries the theme colour, white ring and the category icon path', () => {
    const svg = buildPinSvg('water', '#2C6E9E', 'default')
    expect(svg).toContain('#2C6E9E')
    expect(svg).toContain('stroke="#ffffff"')
    expect(svg).toContain(CATEGORY_ICON.water)
    expect(buildPinSvg('water', '#2C6E9E', 'hover')).toContain('fill-opacity')
    expect(buildPinSvg('water', '#2C6E9E', 'selected')).toContain('#1F2A24')
  })

  it('cluster style shows the count', () => {
    const styles = getClusterStyle(12)
    expect(styles.map((s) => s.getText()?.getText())).toContain('12')
    expect(getClusterStyle(13)).not.toBe(styles)
  })
})
