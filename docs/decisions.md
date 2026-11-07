# Decisions

This file records where the build deliberately differs from the reference material (`cary-explorer-reference/`) and why. Read it before undoing one of these choices. Each entry names the file or setting it covers. When a decision changes, update its entry in the same pull request.

## 1. Five themes over eight categories

**Context:** Places need a small set of colours and filter chips, but the data needs finer labels such as `park`, `trail` and `history`.

**Decision:** Users see five themes. Each of the eight categories maps to one theme through `CATEGORY_THEME`. The `theme` field is derived when the catalog loads, not stored in the JSON.

**Reference's position:** The reference's frontend notes do not describe a theme layer; they work with place categories directly.

**Consequence:** Adding a category means adding it to `CATEGORY_THEME`, or the parser rejects it.

**Applies to:** `src/features/themes/themes.ts` (`THEMES`, `CATEGORY_THEME`), `src/features/places/catalog.ts` (`parsePlace`), `src/types/place.ts`.

## 2. Zustand store for shared UI state

**Context:** Selection, theme filters, search text and view mode are read by the map, the panel, the search box and the list at the same time.

**Decision:** One Zustand store holds `selectedPlaceId`, `activeThemes`, `searchQuery`, `view` and `sheetState`. The map camera stays inside OpenLayers, not in the store. The selected place, themes, view, search text and camera are mirrored to the URL (see decision 15, #35); `sheetState` and `panelCollapsed` are layout only and stay out of it.

**Reference's position:** The reference says to keep state small, store shareable state in the URL, and add a store only when several unrelated components need it. Its list of state (selected ID, search text, filters, view, camera) matches here, except that the camera stays in OpenLayers and `sheetState` is added.

**Consequence:** Components read state without prop chains. Any shareable field added later must also be mirrored to the URL, or deep links will break.

**Applies to:** `src/store/useAppStore.ts`.

## 3. Full ARIA combobox for search

**Context:** Search results must be usable by keyboard and by screen readers, and the map may be unavailable.

**Decision:** The search input is a combobox. It uses `aria-expanded`, `aria-controls`, `aria-activedescendant` and a `listbox` of options. Arrow keys move the active option, Enter selects it, and Escape closes the list (or clears the query when the list is closed). A `role="status"` region announces the result count.

**Reference's position:** The reference uses a labelled input and a list of buttons. It says this avoids a partly built combobox, and that a richer autocomplete must implement the full keyboard and screen-reader behaviour.

**Consequence:** Keyboard behaviour is more complex and needs testing with real screen readers. The test suite has no combobox test yet, so this behaviour is checked by hand only.

**Applies to:** `src/features/search/SearchBox.tsx`, `src/features/search/searchIndex.ts`.

## 4. Three-state mobile sheet, not modal

**Context:** On phones the place details sit in a bottom sheet over the map. The map must stay usable.

**Decision:** The sheet has three heights: `peek` (112 px plus the safe-area inset), `half` (50% of the viewport) and `full` (90%). An explicit handle button cycles through them and sets `aria-expanded`. The sheet is a plain `section`, not a dialog, so it does not trap focus. Drag gestures and snap points are not built.

**Reference's position:** The reference's layout is non-modal and has explicit expand and collapse controls. Its example has no drag gestures and no three snap positions, and it says a modal sheet would need a dialog with focus management.

**Consequence:** Users can reach the map while the sheet is open. Adding drag later is a new feature, not a fix. Making the sheet modal would require the dialog pattern the reference describes.

**Applies to:** `src/features/places/MobilePanel.tsx`, `SheetState` in `src/store/useAppStore.ts`.

## 5. Catalog file shape `{sources, places}`

**Context:** Places cite one or more sources, and the browser must reject bad data before it reaches the map or search.

**Decision:** `catalog.json` is an object with a `sources` array and a `places` array. Each place lists `sourceIds`, and every id must match a source. The parser builds new objects from an allowlist of fields, rejects unknown categories, and checks coordinates and URLs. `loadCatalog` caps decoded bytes at 2 MB by default.

**Reference's position:** The reference's `architecture.md` describes a `catalog.json` with places and separate `places/<id>.json` detail files. Its example `Place` type combines catalog and basic detail fields in one record.

**Consequence:** Source details are stored once and shared. Extra upstream fields are dropped on purpose, so a new field must be added to the parser before it is used.

**Applies to:** `src/features/places/catalog.ts`, `public/data/catalog.json`, `src/types/place.ts`.

## 6. Newer tooling versions than the reference pins

**Context:** The reference pins versions that were current when it was written. The app was started later.

**Decision:** The app uses newer versions. Installed versions match the ranges in `package.json`:
- React 19.3.1 (reference 19.2.8)
- OpenLayers 10.11.0 (reference 10.9.0)
- Fuse.js 7.5.0 (reference 7.1.0)
- TypeScript 7.0.2 (reference 5.9.3)
- Vitest 5.0.5 (reference 3.2.7)
- Vite 8.3.5 and oxlint 1.90.0 (not in the reference)

The seven test files (76 tests) pass on these versions.

**Reference's position:** Its `development.md` says the pins describe the checked environment, and that the tree should be reviewed and locked before adoption.

**Consequence:** Upgrades are deliberate. Re-run `npx vitest run` and `npm run typecheck` after any bump.

**Applies to:** `package.json`, lock file.

## 7. Libraries not adopted yet

**Context:** Several libraries from the planned stack are not needed yet.

**Decision:** Base UI, TanStack Router, TanStack Query and Turf are not installed. Each will be added when a task needs it, not before.

**Reference's position:** Base UI is an optional design-system choice in `frontend.md`. The reference says a data-fetching library can be added later for caching and retries.

**Consequence:** Routing and data fetching use plain code for now (for example `loadCatalog`). URL state (#35) used a small History API layer instead of TanStack Router (see decision 15). Revisit TanStack Router when geometry work starts or the URL needs many more fields.

**Applies to:** `package.json` (`dependencies`, `devDependencies`).

## 8. Desktop panel overlays the map

**Context:** On desktop, the place panel sits on the left and the map fills the rest of the screen.

**Decision:** The panel is an absolute overlay, 400 px wide, on top of a full-screen map. When a place is selected, the camera is padded so the place lands in the visible part of the map.

**Reference's position:** `frontend.md` prefers a desktop panel that resizes the map, rather than one that hides selected features.

**Consequence:** The map stays full-bleed. The panel width and the camera padding in `MapView` both come from `DESKTOP_PANEL_WIDTH` in `src/lib/layout.ts`, so they cannot drift apart. The map notes offset uses the same constant. See #34.

**Applies to:** `src/features/places/DesktopPanel.tsx` (inline `width`), `src/features/map/MapView.tsx` (`selectionPadding`), `src/features/map/MapNotes.tsx`, `src/features/map/map.css` (scale line, 416 px = 400 + 16).

## 9. The brief's source of truth

**Context:** The project brief first lived in a Google Doc (dated Nov 1). A newer copy was written later.

**Decision:** The newer `brief.md` (dated Nov 2) in the shared reference zip supersedes the Google Doc. The brief's text is deliberately not copied into this repo. `docs/README.md` links to the Google Doc and to this file.

**Reference's position:** The reference's `development.md` refers to the product brief as the source for the acceptance checklist.

**Consequence:** Contributors who need the brief should use the zip, which wins over the Google Doc. Copying its text here would create a second copy that drifts.

**Applies to:** `docs/README.md`; the shared reference zip `brief.md` (not in the repo).

## 10. Map engine: OpenLayers only

**Context:** Two map libraries are common: OpenLayers and MapLibre GL JS.

**Decision:** The app uses OpenLayers. MapLibre GL JS is added only if custom vector cartography becomes a priority. That is a product and team choice. Use one engine, never both.

**Reference's position:** `frontend.md` names OpenLayers for maps.

**Consequence:** Map code is written against OpenLayers APIs. Switching later means rewriting `MapView` and the pin styles.

**Applies to:** `package.json` (`ol`), `src/features/map/MapView.tsx`.

## 11. List view stays in the panel

**Context:** Users can switch between a map and a list of the same places.

**Decision:** The list renders inside the desktop panel (400 px) and inside the full-height sheet on phones. The map stays mounted behind it, so the camera survives a toggle. Switching to the list on a phone opens the sheet at `full` and hides the zoom buttons.

**Reference's position:** `frontend.md` says list mode gives the panel the whole page.

**Consequence:** The list is narrower on desktop, but the map state is kept without extra work. Keep the map mounted when changing the layout.

**Applies to:** `src/features/places/PanelBody.tsx`, `src/features/places/ListView.tsx`, `src/features/places/ViewToggle.tsx`, `setView` in `src/store/useAppStore.ts`, `src/app/App.tsx`.

## 12. Basemap created inside `MapView`

**Context:** The map needs a background layer. The source must be swappable once a provider is chosen (#3).

**Decision:** `MapView` calls `createBasemapLayer()` itself, passing a tile-status callback. The current source is public OpenStreetMap tiles, for development only. The production provider is tracked in #3.

**Reference's position:** `frontend.md` says the application passes a configured basemap layer into the map. `development.md` says to memoise configured basemap layers.

**Consequence:** Changing the provider means editing `basemap.ts`, not passing a prop. Move the call to a prop when #3 lands, or sooner if a second map needs a different basemap.

**Applies to:** `src/features/map/basemap.ts`, `src/features/map/MapView.tsx`.

## 13. Launch shape and deployment

**Context:** The brief describes three architecture levels: a static viewer, a static viewer plus a small cached service, and a database-backed app.

**Decision:** Build for level 2: a static site plus versioned data files. Add a small cached service only for keyed or on-demand data (eBird, geocoder; see #16). No database, accounts or server runtime for now. Hosting and deployment, including the existing dev server, belong to another team. This repo produces the static build (`npm run build` → `dist/`) and the data artifacts.

**Reference's position:** The brief recommends level 2 as the launch shape and defers a database until it is needed.

**Consequence:** Keep provider-specific code small. Do not add deploy config, server setup or hosting choices in this repo. Hand the built `dist/` and data files to the deploy team.

**Applies to:** `package.json` build script, `dist/`, #16, #3 (basemap only), #43 (closed: owned by another team).

## 14. Real catalog from Cary data

**Context:** Cary's parks dataset is land parcels, not park outlines: 867 records, of which 668 are greenway-corridor parcels and 46 are future parks. A park can be several parcels. Greenways come as segments. There is no county field and no stable id.

**Decision:** Parks are parcels with use level Existing Park, Natural Area or Community Use Facility, grouped by normalized name into one place. Community Use Facility maps to the community category. Street-side trails are excluded from greenway places by the name rule (for example Davis Dr Street-Side Trail, 3.9 mi); they can come back as a separate category later. Greenways are Existing segments grouped by name, and kept when they are at least 0.5 mi long and are not a connector, street-side, sidewalk or side-path. Ids are `cary-park-<slug>` and `cary-greenway-<slug>`, recorded once in `pipeline/ids.json` and never changed. A place's county comes from a point-in-polygon test of its point against Census county polygons. The official page link is joined from Cary's park points. Descriptions are one generated factual line until curated text arrives (#68). Sample places are removed.

**Reference's position:** The brief asks for stable ids that do not depend on display names, canonical places linked to their source records, and no merging of records by proximity alone.

**Consequence:** Renaming a park in Cary's data creates a new id unless `ids.json` is updated by hand. The History, Water and Art themes have no real places until their own issues land (#22, #24, #26). Map pins are representative points; park and greenway shapes are drawn later (#38).

**Applies to:** `pipeline/scripts/build-catalog.mjs`, `pipeline/ids.json`, `pipeline/aliases.json`, `public/data/catalog.json`, `public/data/layers/`.

## 15. Shareable links with a small History API layer

**Context:** A selected place, view, filters, search text and map camera should survive a reload and be shareable. Sheet state and panel collapse are layout only.

**Decision:** The URL query string holds `place`, `themes` (omitted when all themes are on), `view`, `q` and `map=<zoom>/<lat>/<lon>`. Default values are omitted. Sheet state and panel collapse stay out of the URL. Selecting a place, changing the view and changing filters push a history entry. Camera moves and search typing replace the current entry, and typing is debounced. Values are validated on load. A place that is not in the current data shows a "not in the current data" note. There is no router library.

**Reference's position:** The brief's stack names TanStack Router and says shareable state belongs in the URL. `frontend.md` says to keep state small.

**Consequence:** The URL carries only a few fields, so no router is needed. Adding routes or many more URL fields later is the point to revisit TanStack Router. Query strings need no static-host fallback, so the deploy team needs no rewrite rules.

**Applies to:** `src/lib/urlState.ts`, `src/app/useUrlSync.ts`, `src/store/useAppStore.ts`, `src/features/map/MapView.tsx`, `src/features/places/PlaceCard.tsx`.

## 16. Data pipeline: adapters, release gates and refresh runner

**Context:** The brief's data preparation steps (snapshot, normalize, canonical places, overrides, relationships, publish) need a repeatable runner and must not take the site down when one source fails. The app has no database and no server runtime (#13). Sources differ in licence terms, and most are ArcGIS or opendatasoft feeds that cap responses per request.

**Decision:** Run the pipeline on a GitHub Actions weekly schedule (Mondays 09:00 UTC) plus manual dispatch. The job never pushes to `dev` or `main`; it opens a review PR from `data-refresh/<run_id>` when data changed, and it fails without pushing when any step fails. Use no secrets: only open, keyless sources are enabled. Write one Node adapter per source (ArcGIS and opendatasoft paging, count checks, field allowlists). Use Python only for one-off geometry preparation such as `pipeline/tools/make-scope-polygons.py`, and commit its output rather than running it in the job. Keep a source registry, `pipeline/sources.config.json`, with a licence and `licenceStatus` for each source. Only `open` sources can be enabled. Validation gates run before publish: schema, unique ids, coordinate ranges, geometry validity, coverage, feature counts, and samples in Wake, Chatham and Durham. A record-count change of more than ±30% against the last release blocks publish. Publish atomically from `pipeline/.staging/` into `public/data/` and keep the last good release for any source that fails. Manual corrections live in `pipeline/overrides.json`, which a refresh never rewrites. Classify features as core, nearby or outside (#4). Relationships are `contained`, `nearby` (within 400 m) or `curated`, and are never merged into places. eBird stays out of the published pipeline: its output is local only until its API terms are confirmed (#5).

**Reference's position:** The brief lists steps 1 to 6 and asks for validation before publish, versioned output and a source registry with licence status. `architecture.md` asks for a publication job that validates before it writes. The brief leaves the runner open, and #13 asks for the choice to be made and recorded.

**Consequence:** Weekly data changes arrive as reviewable PRs, not as silent pushes. A Workers cron would need secrets and a server-side runtime, so it is deferred until keyed or on-demand data needs one (#16). A large real change in a source's count needs a human to check and override it before the release can publish. Adding a source means adding a registry entry, which keeps its licence visible.

**Applies to:** `pipeline/`, `pipeline/sources.config.json`, `pipeline/overrides.json`, `pipeline/tools/`, `.github/workflows/data-refresh.yml`, `src/types/data-model.ts`, #13, #16, #4, #5.

## Spike outcomes

Each spike issue adds its outcome here when it closes.

- #1 Confirm scope and priorities with the author: pending, add when the issue closes.
- #2 Review Wander Wake County and define what we do differently: pending, add when the issue closes.
- #3 Choose a production basemap and hosting: pending, add when the issue closes.
- #4 Define geographic scope rules: done. Core = Wake ∪ full Cary limits; 5 mi buffer (cap 10 mi) in EPSG:32119; crossing features kept up to 5 km past the buffer; town filters default to the full limit with coverage labels. See [scope.md](scope.md).
- #5 Check eBird API terms, limits and place matching: done, with open owner questions (API key holder, non-commercial use, public snapshot). Prototype snapshot is minimal (id, name, location, link). See [ebird.md](ebird.md).
- #6 Snapshot and inspect the first data sources: done. Cary parks and greenways are CC0 and snapshotted; parcels must be dissolved into parks; Wake has an entrances layer; Chatham data stays out of git until its terms are confirmed. See [sources.md](sources.md).
