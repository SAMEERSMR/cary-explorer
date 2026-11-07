// ArcGIS REST adapter (FeatureServer / MapServer layer). Dependency-free; `fetch` is injected for tests.
// Returns { features, expectedCount, sourceModified, idField }. Properties are NOT filtered here (core does that).

const CHUNK_IDS = 200

async function getJson(fetchFn, url) {
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const json = await res.json()
  if (json && json.error) throw new Error(`ArcGIS error ${json.error.code ?? ''} ${json.error.message ?? ''} for ${url}`)
  return json
}

function qs(params) {
  return new URLSearchParams(params).toString()
}

export async function fetchArcgis(source, { fetch: fetchFn = globalThis.fetch } = {}) {
  const where = typeof source.where === 'string' && source.where.trim() ? source.where : '1=1'
  const base = source.url.replace(/\/+$/, '')
  const info = await getJson(fetchFn, `${base}?f=json`)
  const idField = info.objectIdField || 'OBJECTID'
  const pageSize = Math.max(1, Math.min(Number(info.maxRecordCount) || 1000, 2000))
  const edited = info.editingInfo?.dataLastEditDate ?? info.editingInfo?.lastEditDate
  const sourceModified = typeof edited === 'number' ? new Date(edited).toISOString() : null

  const count = await getJson(fetchFn, `${base}/query?${qs({ where, returnCountOnly: 'true', f: 'json' })}`)
  const expectedCount = count.count
  if (!Number.isInteger(expectedCount)) throw new Error(`no count returned for ${base}`)

  const outFields = [...new Set([...(source.fields ?? []), idField])].join(',')
  const common = { outSR: '4326', f: 'geojson', outFields }
  const features = []

  if (info.advancedQueryCapabilities?.supportsPagination !== false) {
    for (let offset = 0; offset < expectedCount; offset += pageSize) {
      const page = await getJson(
        fetchFn,
        `${base}/query?${qs({ where, ...common, orderByFields: idField, resultOffset: String(offset), resultRecordCount: String(pageSize) })}`,
      )
      const got = page.features ?? []
      if (got.length === 0) break
      features.push(...got)
    }
  } else {
    const ids = (await getJson(fetchFn, `${base}/query?${qs({ where, returnIdsOnly: 'true', f: 'json' })}`)).objectIds ?? []
    ids.sort((a, b) => a - b)
    for (let i = 0; i < ids.length; i += CHUNK_IDS) {
      const page = await getJson(
        fetchFn,
        `${base}/query?${qs({ ...common, objectIds: ids.slice(i, i + CHUNK_IDS).join(',') })}`,
      )
      features.push(...(page.features ?? []))
    }
  }
  return { features, expectedCount, sourceModified, idField }
}
