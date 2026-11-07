# Data pipeline

The pipeline turns public sources into the static files the app loads: `public/data/catalog.json`, `public/data/layers/*.geojson`, `public/data/relationships.json`, and `public/data/manifest.json`. It has no database and no server. Design decisions are in `docs/decisions.md` #16.

## Commands

Run from the repo root with Node 22 or later.

| Command | What it does |
|---------|--------------|
| `npm run data:snapshot` | Fetches each enabled source from `pipeline/sources.config.json` (paged ArcGIS and opendatasoft adapters), checks the fetched count against the service count, keeps only allowlisted fields, and writes `pipeline/sources/<dir>/{data.geojson,meta.json}` and `pipeline/.last-run.json`. Use `-- --only <id,...>` to snapshot selected sources. `pipeline/scripts/snapshot-cary.mjs` remains as a thin wrapper that snapshots only the Cary (opendatasoft) sources. |
| `npm run data:build` | Runs `build-catalog.mjs` (`--out <dir>` to choose the output folder). Writes the catalog, layers, `relationships.json` and coverage classes (core, nearby, outside). |
| `npm run data:publish` | Applies `pipeline/overrides.json`, runs the validation gates, then swaps the release into `public/data` atomically and writes `manifest.json`. |
| `npm run data:refresh` | Runs snapshot, build and publish in order. Output goes to `pipeline/.staging/` until publish. |

The same output comes from the same snapshots, so a re-run on unchanged snapshots changes nothing.

## Source registry

`pipeline/sources.config.json` lists every source:

`id`, `publisher`, `title`, `type` (`ods` or `arcgis`), `url`, `licence`, `licenceStatus` (`open`, `restricted` or `unclear`), `attribution`, `cadence` (`weekly` or `monthly`), `fields` (public field allowlist), `dir`, `enabled`.

Only `open` sources can be enabled. Sources that are `restricted` or `unclear` stay out of the pipeline until their terms are confirmed.

## Snapshot layout

```
pipeline/sources/<dir>/data.geojson   records after the field allowlist
pipeline/sources/<dir>/meta.json      URL, retrieval time, licence, service count, fetched count
pipeline/.last-run.json               per-source result of the latest run (git-ignored)
```

## Gates

Publish stops if any gate fails:

- Schema and unique ids.
- Coordinate ranges and valid geometry.
- Source coverage, including samples in Wake, Chatham and Durham.
- Fetched count matching the service count. A truncated fetch fails the run.
- Record count changing by more than ±30% against the last release. A large change must be checked and, if real, accepted through the overrides file before it publishes.

## Overrides

`pipeline/overrides.json` holds curated descriptions, corrections and amenity or access evidence. A refresh never rewrites it, so curated text survives re-runs.

## Staging and atomic publish

`data:build` writes to `pipeline/.staging/`. `data:publish` replaces the files in `public/data/` in one step. If a source fails, the run reports which source failed and the last good release stays in place.

## Place detail files

`data:build` also writes `places/<id>.json` for every catalog place: `{ id, fields }` with the 14 visit fields in a fixed order (address, entrances, parking, restrooms, paved surface, steps and slope, wheelchair access, hours, drinking water, dog park, playground, picnic shelter, walking trails, phone). A field is `known` (with `value`, `sourceId` and `verifiedAt`) only when a source states it; "No", empty and null are `unknown`, and wheelchair access is known only from an explicit accessibility flag, never from paving. `data:publish` fails if a place lacks a file, a file lacks a key or evidence, and copies `places/` with the rest of the release. See decision 18.

## Manifest

`public/data/manifest.json` records the release version, what it was built from, and for each source: record count, `retrievedAt`, licence, licence status, last successful refresh and `ok`. The browser can show source health from it.

## Weekly workflow

`.github/workflows/data-refresh.yml` runs on Mondays at 09:00 UTC and on manual dispatch. It runs `npm run data:refresh` and `npm test`. If files changed, it pushes a branch `data-refresh/<run_id>` and opens a PR to `dev` with the run report. It never pushes to `dev` or `main`, and it uses no secrets. A failed step fails the job and nothing is pushed.

## Adding a source

1. Add an entry to `pipeline/sources.config.json` with `licenceStatus: "open"`, the licence and attribution text, a `fields` allowlist that contains only the public fields you need, and `enabled: true`.
2. Run `npm run data:snapshot` and check `pipeline/.last-run.json`.
3. Run `npm run data:refresh` and review the diff and the manifest before merging.
