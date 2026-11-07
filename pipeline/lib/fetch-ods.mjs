// Opendatasoft Explore API v2.1 adapter (Cary). `fetch` is injected for tests.
// source.url is the dataset page (https://host/explore/dataset/<id>/); the API URL is derived from it.
// Returns { features, expectedCount, sourceModified, idField, catalog }.

async function getJson(fetchFn, url) {
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

export function odsApiUrl(pageUrl) {
  const u = new URL(pageUrl)
  const m = u.pathname.match(/\/explore\/dataset\/([^/]+)/)
  if (!m) throw new Error(`not an opendatasoft dataset URL: ${pageUrl}`)
  return `${u.origin}/api/explore/v2.1/catalog/datasets/${m[1]}`
}

export async function fetchOds(source, { fetch: fetchFn = globalThis.fetch } = {}) {
  const api = odsApiUrl(source.url)
  const catalog = await getJson(fetchFn, api)
  const m = catalog.metas?.default ?? {}
  const geo = await getJson(fetchFn, `${api}/exports/geojson`)
  return {
    features: geo.features ?? [],
    expectedCount: m.records_count,
    sourceModified: m.modified ?? null,
    idField: source.sortBy ?? null,
    catalog,
  }
}
