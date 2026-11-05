// Row of toggle chips, one per theme, that show or hide that theme on the map and list.
import { useAppStore } from '../../store/useAppStore'
import { THEMES } from './themes'

export function ThemeFilter() {
  const activeThemes = useAppStore((s) => s.activeThemes)
  const toggleTheme = useAppStore((s) => s.toggleTheme)

  return (
    <div
      role="group"
      aria-label="Filter by theme"
      className="flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]"
    >
      {THEMES.map((theme) => {
        const pressed = activeThemes.includes(theme.id)
        return (
          <button
            key={theme.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => toggleTheme(theme.id)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${
              pressed
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-500 bg-white text-neutral-700'
            }`}
          >
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-full border border-white"
              style={{ backgroundColor: theme.color }}
            />
            {theme.label}
          </button>
        )
      })}
    </div>
  )
}
