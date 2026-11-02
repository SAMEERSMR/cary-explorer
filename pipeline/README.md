# Data pipeline (planned)

The pipeline turns raw public sources into the static GeoJSON files the app loads. Nothing here is implemented yet; this is the intended shape.

1. **Snapshot sources**: fetch each source and store the raw copy under `pipeline/sources/`, with its URL, license and retrieval date.
2. **Normalize**: convert each snapshot into a common shape (names, geometry in WGS84, source IDs).
3. **Build canonical places**: merge normalized records into one `Place` per real-world feature.
4. **Apply editorial overrides**: hand-maintained corrections and additions that win over source data.
5. **Precompute relationships**: derive links such as park to watershed.
6. **Publish**: write versioned output files atomically. If a source fails, keep the last good release in place.
