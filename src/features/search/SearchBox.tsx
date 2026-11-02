// Placeholder search input; will be wired to the Fuse.js index in a later step.
export function SearchBox() {
  return (
    <input
      type="search"
      placeholder="Search places"
      aria-label="Search places"
      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
    />
  )
}
