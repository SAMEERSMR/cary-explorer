// Mobile (below md) layout: search and theme chips floating over the map, plus a three-state bottom sheet.
import { useAppStore, type SheetState } from '../../store/useAppStore'
import { CategoryBadge } from '../themes/CategoryIcon'
import { categoryLabel } from '../themes/themes'
import { SearchBox } from '../search/SearchBox'
import { ThemeFilter } from '../themes/ThemeFilter'
import { PanelBody } from './PanelBody'
import { ViewToggle } from './ViewToggle'
import { useSelectedPlace } from './useSelectedPlace'

// The content wrapper is always in the DOM (hidden at peek) so aria-controls always points at a real element.
const CONTENT_ID = 'place-sheet-content'
const NEXT_STATE: Record<SheetState, SheetState> = { peek: 'half', half: 'full', full: 'peek' }
// The peek height adds the bottom safe-area inset so the 112 px content area is not squeezed on notched phones.
const HEIGHT: Record<SheetState, string> = {
  peek: 'h-[calc(112px+env(safe-area-inset-bottom))]',
  half: 'h-[50dvh]',
  full: 'h-[90dvh]',
}
const HANDLE_LABEL: Record<SheetState, string> = {
  peek: 'Expand details to half height',
  half: 'Expand details to full height',
  full: 'Collapse details',
}

export function MobilePanel() {
  const sheetState = useAppStore((s) => s.sheetState)
  const setSheetState = useAppStore((s) => s.setSheetState)
  const selected = useSelectedPlace()

  return (
    <>
      <h1 className="sr-only">Cary Explorer</h1>

      {/* The sheet covers this bar when full, so hide it from sight and the tab order. */}
      <div
        className={`absolute inset-x-0 top-0 z-20 flex flex-col gap-2.5 px-4 pt-4 ${sheetState === 'full' ? 'invisible' : ''}`}
      >
        <div className="rounded-control shadow-[0_2px_8px_rgba(31,42,36,0.12)]">
          <SearchBox />
        </div>
        {/* Single horizontally scrolling row; the bottom padding keeps focus rings from being clipped. */}
        <div className="overflow-x-auto pb-1">
          <ThemeFilter />
        </div>
      </div>

      <section
        aria-label="Explore places"
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-sheet bg-panel pb-[env(safe-area-inset-bottom)] text-ink shadow-[0_-6px_24px_rgba(31,42,36,0.18)] transition-[height] duration-300 motion-reduce:transition-none ${HEIGHT[sheetState]}`}
      >
        <button
          type="button"
          aria-label={HANDLE_LABEL[sheetState]}
          aria-expanded={sheetState !== 'peek'}
          aria-controls={CONTENT_ID}
          onClick={() => setSheetState(NEXT_STATE[sheetState])}
          className="flex h-11 w-full shrink-0 items-center justify-center rounded-t-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
        >
          <span aria-hidden="true" className="h-[5px] w-11 rounded-[3px] bg-[#6F786F]" />
        </button>

        <div className="flex shrink-0 items-center justify-between gap-3 px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {selected && <CategoryBadge category={selected.category} size={40} />}
            <div className="min-w-0">
              <p className="truncate font-display text-[21px] leading-tight font-semibold text-ink">
                {selected?.name ?? 'Explore Cary'}
              </p>
              <p className="truncate text-[13px] text-ink-muted">
                {selected
                  ? categoryLabel[selected.category]
                  : 'Parks, trails, birds, water and history'}
              </p>
            </div>
          </div>
          {/* Compact override of ViewToggle's default sizing, applied from this wrapper only. */}
          <div className="shrink-0 [&_button]:min-h-11 [&_button]:min-w-16 [&_button]:px-3">
            <ViewToggle />
          </div>
        </div>

        <div
          id={CONTENT_ID}
          hidden={sheetState === 'peek'}
          className="flex-1 overflow-y-auto px-5 pb-6"
        >
          {sheetState !== 'peek' && <PanelBody />}
        </div>
      </section>
    </>
  )
}
