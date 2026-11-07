# Data pipeline

The pipeline turns raw public sources into the static files the app loads. Part of it runs now; the rest is planned.

## What exists now

| Script | What it does |
|--------|--------------|
| `pipeline/scripts/snapshot-cary.mjs` | Snapshots Cary open data (parks, greenways, proposed greenways) into `pipeline/sources/cary/`. No dependencies. |
| `pipeline/scripts/snapshot-ebird.mjs` | Snapshots eBird hotspots for Wake, Chatham and Durham into `pipeline/sources/ebird/`. Needs `EBIRD_API_KEY` in `.env`. Output is git-ignored. |
| `pipeline/scripts/build-catalog.mjs` | Builds `public/data/catalog.json` and `public/data/layers/*.geojson` from the snapshots. |

Run them from the repo root (Node 22 or later):

```bash
node pipeline/scripts/snapshot-cary.mjs
node --env-file=.env pipeline/scripts/snapshot-ebird.mjs
node pipeline/scripts/build-catalog.mjs
```

Stable ids live in `pipeline/ids.json`. Name corrections and alternative names live in `pipeline/aliases.json`. Do not change an id by hand unless you also update `ids.json`; see `docs/decisions.md` #14.

## Planned steps

1. **Snapshot sources** (partly done): Cary and eBird snapshots exist. Other sources are not yet snapshotted. Each snapshot keeps its URL, licence and retrieval date.
2. **Normalize** (not done): convert each snapshot into a common shape (names, geometry in WGS84, source IDs).
3. **Build canonical places** (partly done): `build-catalog.mjs` merges Cary records into one place per real-world feature. Only the parks and greenways data is covered; the other themes have no real places yet.
4. **Apply editorial overrides** (not done): hand-maintained corrections and additions that win over source data.
5. **Precompute relationships** (not done): derive links such as park to watershed.
6. **Publish atomically** (not done, tracked in #13): write versioned output files atomically. If a source fails, keep the last good release in place.
