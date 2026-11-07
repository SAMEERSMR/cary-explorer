# Regional park and trail source samples

Retrieved: 2026-11-06 (all requests were unauthenticated GET calls to public ArcGIS REST endpoints or public pages).

These are tiny inspection samples, not snapshots. Full extracts are not stored here. The register rows for these sources live in the scratch file `/private/tmp/claude-501/-Users-sameermathan-Documents-traders-dhan-algo-clone/d3961e80-d04d-4e89-9407-60eaeca37247/scratchpad/regional-rows.md`, and the one-line verdicts are repeated below.

Sample files are GeoJSON in WGS84 (EPSG:4326), requested with `outSR=4326`. Only the fields listed as useful are kept, and the samples are trimmed to 1-3 records each.

## Wake County (inspected)

| Sample file | Layer | Geometry | Records | maxRecordCount | Native CRS | Licence |
|---|---|---|---|---|---|---|
| `wake-parks-sample.geojson` | https://services1.arcgis.com/a7CWfuGP5ZnLYE7I/arcgis/rest/services/Wake_Parks_Public/FeatureServer/0 ("Parks in Wake County") | Point | 292 | 1000 | WKID 102719 (NAD83 NC State Plane ft, latest 2264) | CC-BY-4.0 (structuredLicense) |
| `wake-park-entrances-sample.geojson` | https://services1.arcgis.com/a7CWfuGP5ZnLYE7I/arcgis/rest/services/Wake_Park_Entrances/FeatureServer/0 ("Park Entrances in Wake County") | Point | 900 | 1000 | WKID 102719 | CC-BY-4.0 |

Notes:
- Both layers were last edited 2026-09-01 per the layer metadata. Hub item modified 2026-02-17.
- Wake Parks is a point layer, not polygons. It includes parks run by other jurisdictions (the sample is a City of Raleigh park), so filter by `JURISDICTION` or location.
- `Lat`/`Lon` are sometimes null, so use geometry.
- Entrances split into `VEHICLEENTRANCE`, `GREENWAYENTRANCE`, `PEDESTRIANENTRANCE`, `PARKINGLOT`, `PARKINGSTREET` flags.
- Wake Park Entrances layer metadata has the wrong `name` ("Wake Parks") and a copy-pasted description. Do not trust the layer name.
- Not inspected: Wake County Greenways (`https://maps.wake.gov/arcgis/rest/services/OpenSpace/Greenways/MapServer/0`, 1,299 features per hub, maxRecordCount 2000). `maps.wake.gov` did not connect from this network.

## Chatham County (inspected)

> **Chatham samples are not committed.** The park-boundary layer forbids resale (NCGS 132-10) and the parks layer states no licence, so the sample files were removed from the repo until Chatham GIS confirms the terms. Re-fetch them with the URLs in the table below.

| Sample file | Layer | Geometry | Records | maxRecordCount | Native CRS | Licence |
|---|---|---|---|---|---|---|
| `chatham-parks-sample.geojson` | https://gisservices.chathamcountync.gov/opendataagol/rest/services/ReferenceData/Chatham_Parks/MapServer/0 ("Chatham County - Parks") | Point | 75 | 2000 | WKID 102719 | none stated on the item |
| `chatham-park-boundaries-sample.geojson` | https://gisservices.chathamcountync.gov/opendataagol/rest/services/ReferenceData/Chatham_ParkBoundaries/MapServer/0 ("Chatham County - Park Boundaries") | Polygon | 166 | 2000 | WKID 102719 | custom: "Any resale of this data is strictly prohibited in accordance with North Carolina General Statute 132-10." |

Notes:
- Chatham Parks points include `FEATURECODE` values for Park, Park Entrance, Trailhead, Boat Ramp, Beach, and others. Entrances and trailheads are available here (for example, 14+ "Park Entrance" rows).
- The Park Boundaries layer also includes areas outside Chatham County (the layer description says "and the surrounding area").
- Cary-addressed records: one Chatham trailhead, "New Hope Church Rd ATT Trailhead and Park" (2575 New Hope Church Rd, Cary, NC 27519, PA034). This is a Chatham-owned site with a Cary postal address, not a Cary-owned park. No other Cary-addressed park was found.
- Licence caveat: the Chatham boundary layer's resale prohibition conflicts with committing these samples to a public repository. Confirm the terms with Chatham GIS before keeping these files in git.
- `last_edited_date` of the sample record is 2026-06-09. Item modified 2026-10-31.
- Editor fields (`created_user`, `last_edited_user`) are present in the source and are dropped from the sample.

## Durham (not inspected)

- `https://webgis2.durhamnc.gov/server/rest/services/ProjectServices/Trans_HikeBikeMap/MapServer` did not connect from this network (TCP connect hangs). No sublayers, counts, or samples could be retrieved.
- The DCHC MPO hub has a "Durham Existing Trails" layer (`https://gis.dchcmpo.org/mpogis1/rest/services/Plan/DurhamBikePed/MapServer/2`). It was found in search but not inspected. It is a metropolitan planning organization copy, not the City/County source.

## Other register sources (no data downloaded)

See the register table in the scratch file. Summary:
- NC HPO GIS: monthly zip `NCHPO_GISdata_2026-11-03.zip` (27 MB), page read only.
- iNaturalist: licence is per observation/photo; page terms returned 403.
- eBird: see `docs/ebird.md`.
- NC DEQ basin maps and USGS 3DHP: not inspected (USGS returned an empty page; DEQ page not reached).
- Cary stream sensors page: 403 to automated access.
- Cary Facility Site Assets (layer 1): 354 point features, maxRecordCount 2000, no licence stated.
- Cary Fire Station (layer 0): 25 point features, maxRecordCount 2000, no licence stated.
