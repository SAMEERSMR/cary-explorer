// Mobile (below md) layout: search and theme chips floating over the map, plus a three-state bottom sheet.
import { useAppStore, type SheetState } from '../../store/useAppStore'
import { SearchBox } from '../search/SearchBox'
import { ThemeFilter } from '../themes/ThemeFilter'
import { PanelBody } from './PanelBody'
import { ViewToggle } from './ViewToggle'
import { useSelectedPlace } from './useSelectedPlace'

const NEXT_STATE: Record<SheetState, SheetState> = { peek: 'half', half: 'full', full: 'peek' }
// The peek height adds the bottom safe-area inset so the header row is not squeezed on notched phones.
const HEIGHT: Record<SheetState, string> = {
  peek: 'h-[calc(6rem+env(safe-area-inset-bottom))]',
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
        className={`absolute inset-x-0 top-0 z-20 space-y-1 p-3 ${sheetState === 'full' ? 'invisible' : ''}`}
      >
        <SearchBox />
        <ThemeFilter />
      </div>

      <section
        aria-label="Explore places"
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.15)] transition-[height] duration-300 motion-reduce:transition-none ${HEIGHT[sheetState]}`}
      >
        <button
          type="button"
          aria-label={HANDLE_LABEL[sheetState]}
          aria-expanded={sheetState !== 'peek'}
          onClick={() => setSheetState(NEXT_STATE[sheetState])}
          className="flex h-11 w-full shrink-0 items-center justify-center rounded-t-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
        >
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-neutral-400" />
        </button>

        <div className="flex shrink-0 items-center justify-between gap-3 px-4">
          {sheetState === 'peek' && (
            <p className="min-w-0 truncate text-base font-semibold">
              {selected?.name ?? 'Explore Cary'}
            </p>
          )}
          <ViewToggle />
        </div>

        {sheetState !== 'peek' && (
          <div className="flex-1 overflow-y-auto p-4">
            <PanelBody />
          </div>
        )}
      </section>
    </>
  )
}
