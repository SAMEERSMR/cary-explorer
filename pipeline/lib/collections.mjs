// Curated collections (issue #45): transparent rules over data that already exists in the release.
// Each collection records the rule it was built with in `curation`. Collections whose data does not exist yet
// (history, creeks, public art, birding) are NOT shipped empty; they are listed as pending in docs/collections.md.
// Never build a collection around sensitive wildlife locations.

export const COLLECTION_MAX_PLACES = 12

const byName = (a, b) => a.name.localeCompare(b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** Most confirmed amenities first, Cary on ties, then name; the first `max`, kept in that ranked order. */
function pick(places, max = COLLECTION_MAX_PLACES) {
  const count = (p) => (p.amenities ?? []).length
  const cary = (p) => (p.municipality === 'Cary' ? 0 : 1)
  return [...places]
    .sort((a, b) => count(b) - count(a) || cary(a) - cary(b) || byName(a, b))
    .slice(0, max)
    .map((p) => p.id)
}

const knownField = (detail, key) => (detail?.fields ?? []).some((f) => f?.key === key && f.status === 'known')

/**
 * Pure builder. `places` are catalog places, `details` maps place id -> parsed places/<id>.json.
 * Returns { collections } with only non-empty collections, in a fixed order.
 */
export function buildCollections(places, details = {}) {
  const collections = []

  const withRestroom = places.filter(
    (p) => p.category === 'park' && (p.amenities ?? []).includes('restrooms') && knownField(details[p.id], 'entrances'),
  )
  if (withRestroom.length > 0) {
    collections.push({
      id: 'short-visit-restroom',
      title: 'A short visit with a restroom nearby',
      summary: 'Parks with a confirmed restroom and a recorded entrance, so you know where to arrive.',
      placeIds: pick(withRestroom),
      curation: `Parks with a recorded restroom and entrance (a park with either unknown is left out), most confirmed facilities first, Cary first on ties, then by name; up to ${COLLECTION_MAX_PLACES}.`,
    })
  }

  const paved = places.filter((p) => p.category === 'trail' && (p.amenities ?? []).includes('pavedSurface'))
  if (paved.length > 0) {
    collections.push({
      id: 'paved-trails',
      title: 'Paved trails',
      summary: 'Trails whose surface is recorded as paved.',
      placeIds: pick(paved),
      curation: `Trails with a confirmed paved surface (partly paved trails are left out), most confirmed facilities first (trail length is not in the data), Cary first on ties, then by name; up to ${COLLECTION_MAX_PLACES}. This says nothing about wheelchair access.`,
    })
  }

  return { collections }
}

/** Release gate. Returns error strings; empty when the collections are valid for this catalog. */
export function validateCollections(data, placeIds) {
  const errors = []
  if (data === null || typeof data !== 'object' || !Array.isArray(data.collections)) {
    return ['collections: must be { collections: [...] }']
  }
  const seen = new Set()
  for (const [i, c] of data.collections.entries()) {
    const label = `collections[${i}]${typeof c?.id === 'string' ? ` "${c.id}"` : ''}`
    if (c === null || typeof c !== 'object') {
      errors.push(`${label}: must be an object`)
      continue
    }
    if (typeof c.id !== 'string' || !/^[a-z0-9-]{1,60}$/.test(c.id)) errors.push(`${label}: id must be 1-60 chars of a-z, 0-9, "-"`)
    else if (seen.has(c.id)) errors.push(`${label}: duplicate id`)
    else seen.add(c.id)
    for (const key of ['title', 'summary', 'curation']) {
      if (typeof c[key] !== 'string' || !c[key].trim()) errors.push(`${label}: ${key} must be a non-empty string`)
    }
    if (!Array.isArray(c.placeIds) || c.placeIds.length === 0) {
      errors.push(`${label}: placeIds must be a non-empty array`)
      continue
    }
    const inCollection = new Set()
    for (const id of c.placeIds) {
      if (typeof id !== 'string' || !id) errors.push(`${label}: placeIds must be non-empty strings`)
      else if (!placeIds.has(id)) errors.push(`${label}: place "${id}" is not in the catalog`)
      else if (inCollection.has(id)) errors.push(`${label}: place "${id}" listed twice`)
      else inCollection.add(id)
    }
  }
  return errors
}
