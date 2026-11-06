# Boundary snapshots

Small snapshots for the scope spike (#4). They are for checking the rules in `docs/scope.md`, not the final pipeline inputs. Re-download from the URLs below for real builds.

| File | Source URL | Licence | Retrieved |
|------|------------|---------|-----------|
| `cary-corporate-limits.geojson` | https://data.townofcary.org/api/explore/v2.1/catalog/datasets/cary-corporate-limits/exports/geojson (Town of Cary, last edited 2026-10-01) | CC0 1.0 | 2026-11-06 |
| `census-counties-wake-chatham-durham.geojson` | https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/11 (US Census TIGERweb, current vintage, WGS84) | US Government work, public domain | 2026-11-06 |

Both files are in WGS84 (EPSG:4326). Do distance work in EPSG:32119, not in degrees.
