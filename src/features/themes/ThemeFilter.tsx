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
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-1 ${
              pressed
                ? 'border-ink bg-ink text-white'
                : 'border-edge bg-white text-ink'
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${pressed ? 'shadow-[0_0_0_2px_#FFFFFF]' : ''}`}
              style={{ backgroundColor: theme.color }}
            />
            {theme.label}
          </button>
        )
      })}
    </div>
  )
}
