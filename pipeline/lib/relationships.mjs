// Relationships between catalog places. Records are never merged; this only links them.
//
// Input items: { id, kind: 'park' | 'trail', polygons?: Polygon[], lines?: Position[][], points?: Position[] }
//   park  = any place drawn as polygons (or a single point when only a centroid is known)
//   trail = a greenway drawn as lines
// Output: [{ from, to, kind }] sorted by kind, from, to.
//
// Rules:
//   contained: a trail with any vertex inside a park polygon -> { from: trailId, to: parkId, kind: 'contained' }.
//   nearby:    park-park and park-trail pairs whose geometries come within NEARBY_M (400 m). Trail-trail pairs
//              are not linked. Distance is the smallest haversine distance between any vertex of one and any
//              vertex of the other (cheap and slightly generous for parks with sparse vertices), or 0 when a
//              vertex of one lies inside a polygon of the other. A bbox prefilter (expanded by 400 m) rejects
//              most pairs, and only vertices inside the other's expanded bbox are compared. Pairs already
//              'contained' are not repeated as 'nearby'. park-park: from is the lower id; park-trail: from is
//              the park.
import { extent, haversineM, pointInPolygon } from './geo.mjs'

export const NEARBY_M = 400
const M_PER_DEG_LAT = 111320

function prep(item) {
  const polygons = item.polygons ?? []
  const verts = item.kind === 'trail' ? (item.lines ?? []).flat() : [...polygons.flat(2), ...(item.points ?? [])]
  const vertices = verts.filter((p) => Array.isArray(p) && typeof p[0] === 'number')
  const bbox = extent(vertices)
  const polyBoxes = polygons.map((polygon) => ({ polygon, bbox: extent(polygon[0] ?? []) }))
  return { id: item.id, kind: item.kind, vertices, bbox, polyBoxes }
}

const grow = (b, m) => {
  const dLat = m / M_PER_DEG_LAT
  const dLon = dLat / Math.max(0.2, Math.cos((((b[1] + b[3]) / 2) * Math.PI) / 180))
  return [b[0] - dLon, b[1] - dLat, b[2] + dLon, b[3] + dLat]
}
const overlap = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
const inBox = (p, b) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3]

function insideAny(point, target) {
  for (const pb of target.polyBoxes) if (inBox(point, pb.bbox) && pointInPolygon(point, pb.polygon)) return true
  return false
}

function within(a, b, boxA, boxB) {
  const va = a.vertices.filter((p) => inBox(p, boxB))
  const vb = b.vertices.filter((p) => inBox(p, boxA))
  if (va.some((p) => insideAny(p, b)) || vb.some((p) => insideAny(p, a))) return true
  for (const p of va) for (const q of vb) if (haversineM(p, q) <= NEARBY_M) return true
  return false
}

export function computeRelationships(items) {
  const list = items.map(prep).filter((p) => p.vertices.length)
  const boxes = list.map((p) => grow(p.bbox, NEARBY_M))
  const out = []
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      if (a.kind === 'trail' && b.kind === 'trail') continue
      if (!overlap(boxes[i], boxes[j])) continue
      const [park, other] = a.kind === 'park' ? [a, b] : [b, a]
      if (other.kind === 'trail' && other.vertices.some((p) => insideAny(p, park))) {
        out.push({ from: other.id, to: park.id, kind: 'contained' })
        continue
      }
      if (within(a, b, boxes[i], boxes[j])) {
        const [from, to] = other.kind === 'trail' ? [park.id, other.id] : a.id < b.id ? [a.id, b.id] : [b.id, a.id]
        out.push({ from, to, kind: 'nearby' })
      }
    }
  }
  const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0)
  out.sort((x, y) => cmp(x.kind, y.kind) || cmp(x.from, y.from) || cmp(x.to, y.to))
  return { relationships: out }
}
