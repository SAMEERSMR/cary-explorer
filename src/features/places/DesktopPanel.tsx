// Desktop (md+) left side panel: title, search, theme filters, view toggle and body.
import { SearchBox } from '../search/SearchBox'
import { ThemeFilter } from '../themes/ThemeFilter'
import { PanelBody } from './PanelBody'
import { ViewToggle } from './ViewToggle'

export function DesktopPanel() {
  return (
    <aside
      aria-label="Place explorer"
      className="absolute inset-y-0 left-0 z-20 flex w-[380px] flex-col border-r border-neutral-200 bg-white shadow-lg"
    >
      <div className="relative z-10 shrink-0 space-y-3 p-4">
        <h1 className="text-xl font-semibold">Cary Explorer</h1>
        <SearchBox />
        <ThemeFilter />
        <ViewToggle />
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-1">
        <PanelBody />
      </div>
    </aside>
  )
}
