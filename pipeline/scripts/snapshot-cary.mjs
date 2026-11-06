#!/usr/bin/env node
// Snapshot Cary open data (opendatasoft Explore API v2.1) into pipeline/sources/cary/<dataset>/.
// Usage: node pipeline/scripts/snapshot-cary.mjs   (node >= 22, no dependencies)
// Writes: data.geojson (reduced properties, raw WGS84 geometry), metadata.json (raw catalog metadata),
// meta.json (url, licence, publisher, retrievedAt, sourceModified, recordCount, fields). Fails on count mismatch.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://data.townofcary.org/api/explore/v2.1/catalog/datasets'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'sources', 'cary')

// keep: properties retained in data.geojson. Everything else (owner names, deed refs, editor usernames) is dropped.
const DATASETS = [
  {
    id: 'parks-and-recreation-feature-polygons',
    keep: ['name', 'uselevel1', 'uselevel2', 'uselevel3', 'calcacreag', 'townzone', 'realid', 'created_date', 'last_edited_date'],
  },
  { id: 'greenway-trails', keep: ['name', 'segment', 'status', 'shape_stlength'] },
  {
    id: 'proposed-greenway-trails',
    keep: ['name', 'segment', 'segmentid', 'status', 'trailtype', 'surftype', 'length_in_miles', 'installdate', 'opentopublic', 'ada', 'equestrian', 'looptrail', 'loopname', 'projname', 'created_date', 'last_edited_date'],
  },
  { id: 'parks-and-recreation-feature-map', keep: ['parkurl', 'parkarea', 'restroom', 'playground', 'soccer', 'skatepark', 'naturetrail', 'lake', 'dogpark', 'discgolf'] },
]

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

for (const { id, keep } of DATASETS) {
  const url = `${BASE}/${id}`
  const catalog = await getJson(url)
  const m = catalog.metas.default
  const geo = await getJson(`${url}/exports/geojson`)
  const retrievedAt = new Date().toISOString()
  if (geo.features.length !== m.records_count) {
    throw new Error(`${id}: export has ${geo.features.length} features, catalog says ${m.records_count}`)
  }
  geo.features = geo.features.map((f) => ({
    type: 'Feature',
    properties: Object.fromEntries(keep.filter((k) => k in f.properties).map((k) => [k, f.properties[k]])),
    geometry: f.geometry,
  }))
  const dir = join(OUT, id)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'data.geojson'), JSON.stringify({ type: 'FeatureCollection', features: geo.features }) + '\n')
  await writeFile(join(dir, 'metadata.json'), JSON.stringify(catalog, null, 2) + '\n')
  const meta = {
    url: `https://data.townofcary.org/explore/dataset/${id}/`,
    apiUrl: url,
    title: m.title,
    licence: m.license,
    licenceUrl: m.license_url,
    publisher: m.publisher,
    retrievedAt,
    sourceModified: m.modified,
    dataProcessed: m.data_processed,
    updateFrequency: m.update_frequency,
    recordCount: geo.features.length,
    geometryTypes: m.geometry_types,
    crs: 'WGS84 (EPSG:4326), GeoJSON export',
    upstream: m.references,
    fields: catalog.fields.map((f) => ({ name: f.name, type: f.type, kept: keep.includes(f.name) })),
  }
  await writeFile(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n')
  console.log(`${id}: ${meta.recordCount} features OK (catalog ${m.records_count}), modified ${m.modified}`)
}
