export type VisitKey =
  | 'address' | 'entrances' | 'parking' | 'restrooms' | 'pavedSurface' | 'stepsSlope' | 'wheelchair'
  | 'hours' | 'water' | 'dogPark' | 'playground' | 'picnicShelter' | 'walkingTrails' | 'phone'
export interface VisitField {
  key: VisitKey
  label: string
  status: 'known' | 'unknown'
  value?: string
  sourceId?: string
  verifiedAt?: string
}
type Props = Record<string, unknown>
export const VISIT_FIELDS: [VisitKey, string][]
export const VISIT_KEYS: VisitKey[]
export const ACCESSIBILITY_SOURCES: Set<string>
export function isYes(v: unknown): boolean
export function verifiedDate(meta: { sourceModified?: string; retrievedAt?: string } | undefined): string | undefined
export function wakeAddress(props: Props | undefined): string
export function describeEntrances(entrances: Props[]): string | undefined
export function describeSurface(segments: Props[]): string | undefined
export function describeAccessibility(segments: Props[]): string | undefined
export function buildVisitFields(ctx?: {
  wake?: Props
  caryPoints?: Props[]
  entrances?: Props[]
  segments?: Props[]
  dates?: { wake?: string; entrances?: string; caryFeatures?: string; greenways?: string }
}): VisitField[]
export function validateDetail(detail: unknown, placeId: string, sourceIds?: Set<string>): string[]
export const AMENITY_KEYS: VisitKey[]
export function amenitiesOf(fields: Pick<VisitField, 'key' | 'status'>[] | undefined): VisitKey[]
