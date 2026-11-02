// OpenLayers map inside a React component: created in an effect, disposed on unmount. Shows place points.
import { useEffect, useRef } from 'react'
import 'ol/ol.css'
import OLMap from 'ol/Map'
import View from 'ol/View'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { useAppStore } from '../../store/useAppStore'
import { useFilteredPlaces } from '../places/useFilteredPlaces'
import { usePlaces } from '../places/usePlaces'
import { getTheme } from '../themes/themes'
import type { ThemeId } from '../../types/place'

// Cary, NC as [lon, lat]
const CARY_CENTER: [number, number] = [-78.7811, 35.7915]
const MIN_SELECTED_ZOOM = 14

function pointStyle(color: string, selected: boolean): Style {
  return new Style({
    image: new CircleStyle({
      radius: selected ? 12 : 7,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#ffffff', width: selected ? 4 : 2 }),
    }),
    zIndex: selected ? 2 : 1,
  })
}

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<OLMap | null>(null)
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const selectedIdRef = useRef<string | null>(null)

  const { places: allPlaces } = usePlaces()
  const { places: visiblePlaces } = useFilteredPlaces()
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId)

  useEffect(() => {
    if (!containerRef.current) return

    // Styles are cached per theme colour and selection state.
    const styles = new Map<string, Style>()
    const styleFor = (theme: ThemeId, selected: boolean) => {
      const key = `${theme}:${selected}`
      let style = styles.get(key)
      if (!style) {
        style = pointStyle(getTheme(theme).color, selected)
        styles.set(key, style)
      }
      return style
    }

    const layer = new VectorLayer({
      source: new VectorSource(),
      style: (feature) =>
        styleFor(feature.get('theme') as ThemeId, feature.getId() === selectedIdRef.current),
    })

    // NOTE: Public OSM tile servers are for development only (see OSM tile usage policy).
    // A production basemap provider is still to be chosen.
    const map = new OLMap({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM() }), layer],
      view: new View({
        center: fromLonLat(CARY_CENTER),
        zoom: 12,
      }),
    })

    const onlyPlaces = { layerFilter: (l: unknown) => l === layer }

    map.on('click', (e) => {
      const feature = map.forEachFeatureAtPixel(e.pixel, (f) => f, onlyPlaces)
      const id = feature?.getId()
      if (typeof id === 'string') useAppStore.getState().setSelectedPlaceId(id)
    })

    map.on('pointermove', (e) => {
      if (e.dragging) return
      const target = map.getTargetElement()
      if (target) target.style.cursor = map.hasFeatureAtPixel(e.pixel, onlyPlaces) ? 'pointer' : ''
    })

    mapRef.current = map
    layerRef.current = layer

    return () => {
      mapRef.current = null
      layerRef.current = null
      map.setTarget(undefined)
      map.dispose()
    }
  }, [])

  // Rebuild the point features when places or theme filters change (map is not recreated).
  useEffect(() => {
    const source = layerRef.current?.getSource()
    if (!source) return
    source.clear()
    source.addFeatures(
      visiblePlaces.map((p) => {
        const feature = new Feature({
          geometry: new Point(fromLonLat(p.centroid)),
          theme: p.theme,
        })
        feature.setId(p.id)
        return feature
      }),
    )
  }, [visiblePlaces])

  // Restyle and fly to the selected place.
  useEffect(() => {
    selectedIdRef.current = selectedPlaceId
    layerRef.current?.changed()

    const map = mapRef.current
    const place = allPlaces.find((p) => p.id === selectedPlaceId)
    if (!map || !place) return
    const view = map.getView()
    view.animate({
      center: fromLonLat(place.centroid),
      zoom: Math.max(view.getZoom() ?? 12, MIN_SELECTED_ZOOM),
      duration: 400,
    })
  }, [selectedPlaceId, allPlaces])

  return <div ref={containerRef} className="absolute inset-0" />
}
