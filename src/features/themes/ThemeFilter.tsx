// Row of toggle chips, one per theme, that show or hide that theme on the map and list.
// Desktop wraps the chips; below md they scroll horizontally (the mobile sheet).
import { useAppStore } from '../../store/useAppStore'
import { THEMES } from './themes'

export function ThemeFilter() {
  const activeThemes = useAppStore((s) => s.activeThemes)
  const toggleTheme = useAppStore((s) => s.toggleTheme)

  return (
    <div
      role="group"
      aria-label="Filter by theme"
      className="flex gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] md:flex-wrap md:overflow-visible"
    >
      {THEMES.map((theme) => {
        const pressed = activeThemes.includes(theme.id)
        return (
          <button
            key={theme.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => toggleTheme(theme.id)}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-1 ${
              pressed ? 'text-ink' : 'border-line bg-white text-ink-muted'
            }`}
            style={pressed ? { backgroundColor: theme.tint, borderColor: theme.color } : undefined}
          >
            {pressed ? (
              <svg
                aria-hidden="true"
                focusable="false"
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke={theme.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            ) : (
              <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.color }} />
              </span>
            )}
            {theme.label}
          </button>
        )
      })}
    </div>
  )
}
