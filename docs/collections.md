# Collections

Shipped collections are built by `pipeline/lib/collections.mjs` from data already in the release. Each states its rule in `curation`.

| id | Rule | Count |
|----|------|-------|
| `short-visit-restroom` | Parks with restrooms and entrances both known; core coverage first, then by name; max 12 | 12 |
| `paved-trails` | Trails with a fully confirmed paved surface; core first, then by name; max 12 | 12 |

## Pending (not shipped, no data yet)

- Public art and a park: no art places in the catalog.
- History near a greenway: no history places.
- Meet your creek: no creek or water data.
- Places to watch for birds this month: no public birding data. Never build a collection around sensitive wildlife locations.

A pending collection is added only when its data exists and a rule can be stated; the release gate rejects unknown place ids, duplicate or empty ids and missing titles.
