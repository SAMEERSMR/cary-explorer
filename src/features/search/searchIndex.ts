// Builds the Fuse.js search index over places, searching by name and aliases.
import Fuse, { type IFuseOptions } from 'fuse.js'
import type { Place } from '../../types/place'

const fuseOptions: IFuseOptions<Place> = {
  keys: ['name', 'aliases'],
  threshold: 0.3,
  ignoreLocation: true,
}

export function buildSearchIndex(places: Place[]): Fuse<Place> {
  return new Fuse(places, fuseOptions)
}
