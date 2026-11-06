// Desktop (md+) left side panel: title, search, theme filters, view toggle and body.
import { CategoryIcon } from '../themes/CategoryIcon'
import { SearchBox } from '../search/SearchBox'
import { ThemeFilter } from '../themes/ThemeFilter'
import { DESKTOP_PANEL_WIDTH } from '../../lib/layout'
import { PanelBody } from './PanelBody'
import { ViewToggle } from './ViewToggle'

export function DesktopPanel() {
  return (
    <aside
      aria-label="Explore places"
      className="absolute inset-y-0 left-0 z-20 flex flex-col border-r border-line bg-panel shadow-lg"
      style={{ width: DESKTOP_PANEL_WIDTH }}
    >
      <div className="relative z-10 flex shrink-0 flex-col gap-5 border-b border-line px-6 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-forest"
          >
            <CategoryIcon category="park" size={20} color="#FFFFFF" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-[22px] leading-tight font-semibold text-ink">Cary Explorer</h1>
            <p className="text-[13px] leading-snug text-ink-muted">
              A field guide to parks, trails, birds, water and history
            </p>
          </div>
        </div>
        <SearchBox />
        <ThemeFilter />
        <ViewToggle />
      </div>
      <div className="flex-1 overflow-y-auto px-6 pt-5 pb-6">
        <PanelBody />
      </div>
    </aside>
  )
}
