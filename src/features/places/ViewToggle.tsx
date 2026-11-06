// Segmented Map/List toggle that switches the app view mode.
import { useAppStore, type ViewMode } from '../../store/useAppStore'

const OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'list', label: 'List' },
]

export function ViewToggle() {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  return (
    <div role="group" aria-label="View" className="grid grid-cols-2 gap-1 rounded-control bg-subtle p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={view === o.id}
          onClick={() => setView(o.id)}
          className={`min-h-11 rounded-lg px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-link ${
            view === o.id
              ? 'bg-white text-ink shadow-[0_1px_2px_rgba(31,42,36,0.14)]'
              : 'bg-transparent text-ink-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
