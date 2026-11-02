// OpenLayers map inside a React component: created in an effect, disposed on unmount.
import { useEffect, useRef } from 'react'
import 'ol/ol.css'
import OLMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import { fromLonLat } from 'ol/proj'

// Cary, NC as [lon, lat]
const CARY_CENTER: [number, number] = [-78.7811, 35.7915]

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // NOTE: Public OSM tile servers are for development only (see OSM tile usage policy).
    // A production basemap provider is still to be chosen.
    const map = new OLMap({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({
        center: fromLonLat(CARY_CENTER),
        zoom: 12,
      }),
    })

    return () => {
      map.setTarget(undefined)
      map.dispose()
    }
  }, [])

  return <div ref={containerRef} className="absolute inset-0" />
}
