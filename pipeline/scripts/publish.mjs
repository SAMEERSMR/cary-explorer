#!/usr/bin/env node
// Publishes a staged build into public/data: apply overrides -> validate -> swap in -> manifest.json.
// Usage: node pipeline/scripts/publish.mjs [stagingDir] [--out dir] [--last-run file] [--overrides file] [--allow-stale]
// Fails closed: on any error prints it, exits 1 and leaves the output dir untouched.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyOverrides, loadOverrides } from '../lib/overrides.mjs'
import { countBySource, validateRelease } from '../lib/validate.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

/** Keeps a staged file's own formatting when untouched; otherwise matches the builder's 1-space indent. */
const serialize = (value) => JSON.stringify(value, null, 1) + '\n'

export function publish({
  stagingDir = join(ROOT, 'pipeline', '.staging'),
  outDir = join(ROOT, 'public', 'data'),
  lastRunPath = join(ROOT, 'pipeline', '.last-run.json'),
  overridesPath = join(ROOT, 'pipeline', 'overrides.json'),
  allowStale = false,
  env = process.env,
} = {}) {
  const errors = []
  const warnings = []
  const fail = () => ({ ok: false, errors, warnings })
  if (!existsSync(join(stagingDir, 'catalog.json'))) {
    errors.push(`no catalog.json in staging dir ${stagingDir}`)
    return fail()
  }

  let catalogText, catalog, layers = {}, layerTexts = {}, relText, relationships
  const details = {}
  const detailTexts = {}
  try {
    catalogText = readFileSync(join(stagingDir, 'catalog.json'), 'utf8')
    catalog = JSON.parse(catalogText)
    const layerDir = join(stagingDir, 'layers')
    if (existsSync(layerDir)) {
      for (const f of readdirSync(layerDir).filter((n) => n.endsWith('.geojson')).sort()) {
        layerTexts[f] = readFileSync(join(layerDir, f), 'utf8')
        layers[f.replace(/\.geojson$/, '')] = JSON.parse(layerTexts[f])
      }
    }
    const placesDir = join(stagingDir, 'places')
    if (existsSync(placesDir)) {
      for (const f of readdirSync(placesDir).filter((n) => n.endsWith('.json')).sort()) {
        const id = f.replace(/\.json$/, '')
        detailTexts[id] = readFileSync(join(placesDir, f), 'utf8')
        details[id] = JSON.parse(detailTexts[id])
      }
    } else warnings.push('staging has no places/ directory; every place will fail the detail-file gate')
    if (existsSync(join(stagingDir, 'relationships.json'))) {
      relText = readFileSync(join(stagingDir, 'relationships.json'), 'utf8')
      relationships = JSON.parse(relText)
    } else {
      warnings.push('staging has no relationships.json; publishing an empty relationship set')
      relationships = { relationships: [] }
      relText = serialize(relationships)
    }
  } catch (e) {
    errors.push(`could not read staging: ${e.message}`)
    return fail()
  }

  let overrides = {}
  try {
    overrides = loadOverrides(overridesPath)
  } catch (e) {
    errors.push(e.message)
    return fail()
  }
  const applied = applyOverrides(catalog, overrides)
  warnings.push(...applied.warnings)
  if (applied.applied > 0) {
    catalog = applied.catalog
    catalogText = serialize(catalog)
  }

  let previousManifest = null
  try {
    if (existsSync(join(outDir, 'manifest.json'))) previousManifest = readJson(join(outDir, 'manifest.json'))
  } catch {
    warnings.push('previous manifest unreadable; count-change gate skipped')
  }
  let lastRun = null
  if (existsSync(lastRunPath)) {
    try {
      lastRun = readJson(lastRunPath)
    } catch (e) {
      errors.push(`could not read ${lastRunPath}: ${e.message}`)
      return fail()
    }
  } else warnings.push('no .last-run.json; source failure gate skipped')

  const result = validateRelease({ catalog, layers, relationships, details, previousManifest, lastRun, env, allowStale })
  errors.push(...result.errors)
  warnings.push(...result.warnings)
  if (errors.length) return fail()

  // Manifest: deterministic, no clock reads.
  const hash = createHash('sha256')
  hash.update(catalogText)
  for (const name of Object.keys(layerTexts).sort()) hash.update(`\0${name}\0${layerTexts[name]}`)
  hash.update(`\0relationships\0${relText}`)
  for (const id of Object.keys(detailTexts).sort()) hash.update(`\0place\0${id}\0${detailTexts[id]}`)
  const failed = new Map((lastRun?.sources ?? []).filter((s) => !s.ok).map((s) => [s.id, s]))
  const prevById = new Map((previousManifest?.sources ?? []).map((s) => [s.id, s]))
  const counts = countBySource(catalog)
  const manifestSources = [...catalog.sources]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      id: s.id,
      recordCount: counts[s.id] ?? 0,
      retrievedAt: s.retrievedAt,
      licence: s.license,
      licenceStatus: s.licenceStatus ?? 'declared',
      lastSuccess: failed.has(s.id) ? (prevById.get(s.id)?.lastSuccess ?? s.retrievedAt) : s.retrievedAt,
      ok: !failed.has(s.id),
    }))
  const manifest = {
    version: hash.digest('hex').slice(0, 16),
    generatedFrom: manifestSources.map((s) => s.retrievedAt).sort().at(-1) ?? null,
    sources: manifestSources,
  }

  // Swap: build the full release in a sibling dir, then rename into place.
  const next = `${outDir}.next`
  const prev = `${outDir}.prev`
  try {
    rmSync(next, { recursive: true, force: true })
    rmSync(prev, { recursive: true, force: true })
    mkdirSync(join(next, 'layers'), { recursive: true })
    writeFileSync(join(next, 'catalog.json'), catalogText)
    for (const [name, text] of Object.entries(layerTexts)) writeFileSync(join(next, 'layers', name), text)
    writeFileSync(join(next, 'relationships.json'), relText)
    mkdirSync(join(next, 'places'), { recursive: true })
    for (const [id, text] of Object.entries(detailTexts)) writeFileSync(join(next, 'places', `${id}.json`), text)
    writeFileSync(join(next, 'manifest.json'), serialize(manifest))
    mkdirSync(dirname(outDir), { recursive: true })
    const hadOld = existsSync(outDir)
    if (hadOld) renameSync(outDir, prev)
    try {
      renameSync(next, outDir)
    } catch (e) {
      if (hadOld) renameSync(prev, outDir)
      throw e
    }
    rmSync(prev, { recursive: true, force: true })
  } catch (e) {
    rmSync(next, { recursive: true, force: true })
    errors.push(`swap failed: ${e.message}`)
    return fail()
  }
  return { ok: true, errors, warnings, manifest }
}

function main() {
  const args = process.argv.slice(2)
  const opt = (name) => {
    const i = args.indexOf(name)
    return i >= 0 ? resolve(args[i + 1]) : undefined
  }
  const flagValues = new Set(['--out', '--last-run', '--overrides'].flatMap((n) => (args.includes(n) ? [args[args.indexOf(n) + 1]] : [])))
  const positional = args.find((a) => !a.startsWith('--') && !flagValues.has(a))
  const res = publish({
    ...(positional && { stagingDir: resolve(positional) }),
    ...(opt('--out') && { outDir: opt('--out') }),
    ...(opt('--last-run') && { lastRunPath: opt('--last-run') }),
    ...(opt('--overrides') && { overridesPath: opt('--overrides') }),
    allowStale: args.includes('--allow-stale'),
  })
  for (const w of res.warnings) console.warn(`warning: ${w}`)
  if (!res.ok) {
    for (const e of res.errors) console.error(`error: ${e}`)
    console.error(`publish blocked: ${res.errors.length} error(s); output left untouched`)
    process.exit(1)
  }
  console.log(`published release ${res.manifest.version} (${res.manifest.sources.length} sources)`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
