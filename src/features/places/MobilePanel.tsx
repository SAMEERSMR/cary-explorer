// Mobile (below md) layout: search and theme chips floating over the map, plus a three-state bottom sheet.
import { CreditsButton } from '../about/CreditsButton'
import { useAppStore, type SheetState } from '../../store/useAppStore'
import { CategoryBadge } from '../themes/CategoryIcon'
import { categoryLabel } from '../themes/themes'
import { SearchBox } from '../search/SearchBox'
import { ThemeFilter } from '../themes/ThemeFilter'
import { TownFilter } from '../towns/TownFilter'
import { townNote } from '../towns/coverage'
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
  const note = townNote(useAppStore((s) => s.town))

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
        <div className="rounded-control shadow-[0_2px_8px_rgba(31,42,36,0.12)]">
          <TownFilter compact />
        </div>
        {/* Single horizontally scrolling row; the bottom padding keeps focus rings from being clipped. */}
        <div className="overflow-x-auto pb-1">
          <ThemeFilter />
        </div>
      </div>

      <section
        aria-label="Explore places"
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-sheet bg-panel pb-[env(safe-area-inset-bottom)] text-ink shadow-[0_-8px_24px_rgba(28,36,32,0.14)] transition-[height] duration-300 motion-reduce:transition-none ${HEIGHT[sheetState]}`}
      >
        {/* 44px hit area, centred grab bar. The header sits fully below it (no negative margin). */}
        <button
          type="button"
          aria-label={HANDLE_LABEL[sheetState]}
          aria-expanded={sheetState !== 'peek'}
          aria-controls={CONTENT_ID}
          onClick={() => setSheetState(NEXT_STATE[sheetState])}
          className="flex h-11 w-full shrink-0 items-center justify-center rounded-t-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
        >
          <span aria-hidden="true" className="h-1 w-9 rounded-full bg-[#C9C5BC]" />
        </button>

        {/* No badge column without a selection, so the title lines up with the px-5 content below. */}
        <div
          className={`relative grid shrink-0 items-center gap-3 px-5 pt-0 ${selected ? 'grid-cols-[36px_minmax(0,1fr)_auto_auto]' : 'grid-cols-[minmax(0,1fr)_auto_auto]'}`}
        >
          {selected && <CategoryBadge category={selected.category} size="md" />}
          <div className="min-w-0">
            <p className="truncate font-display text-[20px] leading-tight font-semibold text-ink">
              {selected?.name ?? 'Explore Cary'}
            </p>
            <p className="truncate text-[13px] text-ink-muted">
              {selected ? categoryLabel[selected.category] : (note ?? 'Parks, trails, birds, water and history')}
            </p>
          </div>
          {/* Compact override of ViewToggle's default sizing, applied from this wrapper only. */}
          <div className="shrink-0 [&_button]:min-h-11 [&_button]:min-w-16 [&_button]:px-3">
            <ViewToggle />
          </div>
          <CreditsButton variant="icon" className="-mr-2" />
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
