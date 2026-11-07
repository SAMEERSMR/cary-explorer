import { validateDetail } from './visit.mjs'

// Release gates. validateRelease({ catalog, layers, relationships, previousManifest, lastRun, env, allowStale })
//   layers: { [name]: FeatureCollection }; details: { [placeId]: parsed places/<id>.json } (null skips the check); returns { ok, errors[], warnings[] }.
export const BOUNDS = { lonMin: -80.0, lonMax: -77.8, latMin: 35.0, latMax: 36.6 }
export const COUNT_CHANGE_LIMIT = 0.3
const REQUIRED_COUNTY = 'Wake'
const OPTIONAL_COUNTIES = ['Chatham', 'Durham']
const LAYERED_CATEGORIES = new Set(['park', 'trail'])
// Sources that publish layer geometry; their park/trail places need at least one layer feature.
export const GREENWAY_STATUSES = new Set(['existing', 'proposed'])
export const LAYER_SOURCES = new Set(['cary-parks', 'cary-greenways'])

const inBounds = (p) =>
  Array.isArray(p) &&
  Number.isFinite(p[0]) &&
  Number.isFinite(p[1]) &&
  p[0] >= BOUNDS.lonMin &&
  p[0] <= BOUNDS.lonMax &&
  p[1] >= BOUNDS.latMin &&
  p[1] <= BOUNDS.latMax

function* positions(coords) {
  if (Array.isArray(coords) && typeof coords[0] === 'number') yield coords
  else if (Array.isArray(coords)) for (const c of coords) yield* positions(c)
}

/** Places per source id (the basis for manifest recordCount and the count-change gate). */
export function countBySource(catalog) {
  const counts = Object.fromEntries((catalog.sources ?? []).map((s) => [s.id, 0]))
  for (const p of catalog.places ?? []) for (const id of p.sourceIds ?? []) counts[id] = (counts[id] ?? 0) + 1
  return counts
}

export function validateRelease({
  catalog,
  layers = {},
  relationships = { relationships: [] },
  details = null,
  previousManifest = null,
  lastRun = null,
  env = process.env,
  allowStale = false,
}) {
  const errors = []
  const warnings = []
  const places = catalog?.places ?? []
  const sources = catalog?.sources ?? []

  // Sources: retrievedAt + licence
  for (const s of sources) {
    if (typeof s.retrievedAt !== 'string' || !Number.isFinite(Date.parse(s.retrievedAt))) {
      errors.push(`source "${s.id}": retrievedAt missing or unparseable`)
    }
    if (typeof s.license !== 'string' || !s.license.trim()) errors.push(`source "${s.id}": licence missing`)
  }

  // Unique ids + coordinates
  const ids = new Set()
  for (const p of places) {
    if (ids.has(p.id)) errors.push(`duplicate place id "${p.id}"`)
    ids.add(p.id)
    if (!inBounds(p.centroid)) errors.push(`place "${p.id}": centroid outside study area`)
    if (p.bbox && !(inBounds([p.bbox[0], p.bbox[1]]) && inBounds([p.bbox[2], p.bbox[3]]))) {
      errors.push(`place "${p.id}": bbox outside study area`)
    }
  }

  // Layers
  const featureCount = new Map()
  for (const [name, fc] of Object.entries(layers)) {
    for (const [i, f] of (fc?.features ?? []).entries()) {
      const placeId = f?.properties?.placeId
      if (!ids.has(placeId)) errors.push(`layer "${name}" feature ${i}: placeId "${placeId}" not in catalog`)
      else featureCount.set(placeId, (featureCount.get(placeId) ?? 0) + 1)
      if (name === 'greenways' && !GREENWAY_STATUSES.has(f?.properties?.status)) {
        errors.push(`layer "greenways" feature ${i} (${placeId}): status must be "existing" or "proposed"`)
      }
      for (const pos of positions(f?.geometry?.coordinates)) {
        if (!inBounds(pos)) {
          errors.push(`layer "${name}" feature ${i} (${placeId}): coordinate outside study area`)
          break
        }
      }
    }
  }
  for (const p of places) {
    if (!LAYERED_CATEGORIES.has(p.category)) continue
    if (!(p.sourceIds ?? []).some((id) => LAYER_SOURCES.has(id))) continue
    if (!featureCount.get(p.id)) errors.push(`place "${p.id}" (${p.category}) has no layer feature`)
  }

  // Relationships
  for (const [i, r] of (relationships?.relationships ?? []).entries()) {
    for (const end of ['from', 'to']) {
      if (!ids.has(r[end])) errors.push(`relationship ${i}: ${end} "${r[end]}" not in catalog`)
    }
  }

  // Visit-info detail files: exactly one per catalog place, 14 fields in order, evidence on every known field
  if (details) {
    const sourceIds = new Set(sources.map((s) => s.id))
    for (const id of ids) if (!details[id]) errors.push(`place "${id}" has no places/${id}.json detail file`)
    for (const [id, d] of Object.entries(details)) {
      if (!ids.has(id)) errors.push(`places/${id}.json: id "${id}" is not in the catalog`)
      else errors.push(...validateDetail(d, id, sourceIds))
    }
  }

  // Counties
  const countyCounts = {}
  for (const p of places) if (p.county) countyCounts[p.county] = (countyCounts[p.county] ?? 0) + 1
  if (!countyCounts[REQUIRED_COUNTY]) errors.push(`no places in required county ${REQUIRED_COUNTY}`)
  for (const county of OPTIONAL_COUNTIES) {
    const hasSource = sources.some((s) => s.id.toLowerCase().includes(county.toLowerCase()))
    if (hasSource && !countyCounts[county]) warnings.push(`no places in ${county} County despite a ${county} source`)
  }

  // Record-count drift vs previous manifest
  const allowed = new Set(
    String(env?.PIPELINE_ALLOW_COUNT_CHANGE ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  )
  const counts = countBySource(catalog ?? {})
  for (const prev of previousManifest?.sources ?? []) {
    if (!(prev.recordCount > 0) || counts[prev.id] === undefined) continue
    const change = (counts[prev.id] - prev.recordCount) / prev.recordCount
    if (Math.abs(change) > COUNT_CHANGE_LIMIT) {
      const msg = `source "${prev.id}": record count ${prev.recordCount} -> ${counts[prev.id]} (${(change * 100).toFixed(0)}%)`
      if (allowed.has(prev.id)) warnings.push(`${msg}; allowed by PIPELINE_ALLOW_COUNT_CHANGE`)
      else errors.push(`${msg} exceeds ±${COUNT_CHANGE_LIMIT * 100}%`)
    }
  }

  // Failed sources in the last snapshot run
  for (const s of lastRun?.sources ?? []) {
    if (s.ok) continue
    const msg = `source "${s.id}" failed in last snapshot run${s.error ? `: ${s.error}` : ''}`
    if (allowStale) warnings.push(`${msg}; keeping previous snapshot (--allow-stale)`)
    else errors.push(msg)
  }

  return { ok: errors.length === 0, errors, warnings }
}
