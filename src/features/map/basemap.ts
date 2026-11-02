// Basemap layer for the places map. Swap the source here when a production provider is chosen.
import type BaseLayer from 'ol/layer/Base'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'

/**
 * Public OSM tiles are for development only (OSM tile usage policy).
 * The production basemap provider is tracked in GitHub issue #3.
 *
 * The OSM credit is kept visible by the map's attribution control, which MapView
 * creates uncollapsed (see `defaults({ attributionOptions: { collapsible: false } })`).
 */
export function createBasemapLayer(): BaseLayer {
  return new TileLayer({ source: new OSM() })
}
