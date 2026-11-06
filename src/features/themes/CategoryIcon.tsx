// Category icon and round badge: stroke icons drawn from CATEGORY_ICON, decorative only (aria-hidden).
import type { CSSProperties } from 'react'
import type { CategoryId } from '../../types/place'
import { CATEGORY_THEME, getTheme } from './themes'
import { CATEGORY_ICON, ICON_SVG_ATTRS } from './icons'

export function CategoryIcon({
  category,
  size = 18,
  color = '#FFFFFF',
  strokeWidth = 2,
  className,
}: {
  category: CategoryId
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}) {
  return (
    <svg
      {...ICON_SVG_ATTRS}
      width={size}
      height={size}
      stroke={color}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={CATEGORY_ICON[category]} />
    </svg>
  )
}

/**
 * Round badge filled with the theme colour, white 2px border, white icon centred.
 * `color` defaults to the colour of the category's theme. `ring` adds a halo in the same colour.
 */
export function CategoryBadge({
  category,
  color,
  size = 36,
  ring,
}: {
  category: CategoryId
  color?: string
  size?: number
  ring?: boolean
}) {
  const fill = color ?? getTheme(CATEGORY_THEME[category]).color
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '9999px',
    backgroundColor: fill,
    border: '2px solid #FFFFFF',
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: ring ? `0 0 0 2px ${fill}` : undefined,
  }
  return (
    <span style={style} aria-hidden="true">
      <CategoryIcon category={category} size={Math.round(size * 0.5)} color="#FFFFFF" />
    </span>
  )
}
