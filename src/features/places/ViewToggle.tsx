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
    <div
      role="group"
      aria-label="View"
      className="inline-flex overflow-hidden rounded-lg border border-neutral-500"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={view === o.id}
          onClick={() => setView(o.id)}
          className={`min-h-11 min-w-20 px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
            view === o.id ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
