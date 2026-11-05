// OpenLayers map inside a React component: created once in an effect, disposed on unmount. Shows place points.
import { useEffect, useRef } from 'react'
import 'ol/ol.css'
import OLMap from 'ol/Map'
import { defaults as defaultControls } from 'ol/control'
import View from 'ol/View'
import Feature from 'ol/Feature'
import type { Coordinate } from 'ol/coordinate'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { useAppStore } from '../../store/useAppStore'
import type { SheetState } from '../../store/useAppStore'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { useFilteredPlaces } from '../places/useFilteredPlaces'
import { usePlaces } from '../places/usePlaces'
import { getTheme } from '../themes/themes'
import type { ThemeId } from '../../types/place'
import { createBasemapLayer } from './basemap'
import { MapNotes } from './MapNotes'
import { reportMapInitFailed, reportTileEvent, resetMapStatus } from './mapStatus'

// Cary, NC as [lon, lat]
const CARY_CENTER: [number, number] = [-78.7811, 35.7915]
const MIN_SELECTED_ZOOM = 14
const SELECT_ANIMATION_MS = 400
const HIT_TOLERANCE_PX = 8
const PEEK_SHEET_PX = 96

// Same order as OpenLayers padding: [top, right, bottom, left], in pixels.
type Padding = [number, number, number, number]

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

// Mobile bottom sheet height for each snap state (peek ~96px, half ~50%, full ~90% of the window).
function sheetHeightPx(state: SheetState): number {
  switch (state) {
    case 'peek':
      return PEEK_SHEET_PX
    case 'half':
      return window.innerHeight * 0.5
    case 'full':
      return window.innerHeight * 0.9
  }
}

// Desktop: the side panel covers the left 380px. Mobile: keep clear of the top edge and the bottom sheet.
function selectionPadding(isDesktop: boolean, sheetState: SheetState): Padding {
  if (isDesktop) return [40, 40, 40, 380 + 40]
  return [120, 24, sheetHeightPx(sheetState) + 24, 24]
}

// Animate so `coords` lands in the middle of the part of the map not covered by the panel or sheet.
function flyToPlace(map: OLMap, coords: Coordinate, padding: Padding) {
  const view = map.getView()
  const zoom = Math.max(view.getZoom() ?? 12, MIN_SELECTED_ZOOM)

  let center = coords
  const size = map.getSize()
  if (size) {
    const [top, right, bottom, left] = padding
    const [width, height] = size
    // Pixel where the place should sit: centre of the uncovered area.
    const targetX = (left + (width - right)) / 2
    const targetY = (top + (height - bottom)) / 2
    // Shift the view centre so the place projects onto that pixel at the target zoom.
    const resolution = view.getResolutionForZoom(zoom)
    center = [
      coords[0] + (width / 2 - targetX) * resolution,
      coords[1] + (targetY - height / 2) * resolution,
    ]
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) {
    view.setCenter(center)
    view.setZoom(zoom)
  } else {
    view.animate({ center, zoom, duration: SELECT_ANIMATION_MS })
  }
}

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<OLMap | null>(null)
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  // Last selection the view flew to, so the fly-to runs only when the selection changes.
  const flownIdRef = useRef<string | null>(null)

  const { places: allPlaces } = usePlaces()
  const { places: visiblePlaces } = useFilteredPlaces()
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

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

    const placesLayer = new VectorLayer({
      source: new VectorSource(),
      style: (feature) =>
        styleFor(feature.get('theme') as ThemeId, feature.getId() === selectedIdRef.current),
    })

    resetMapStatus()
    let map: OLMap
    try {
      map = new OLMap({
        target: container,
        // Attribution stays uncollapsed so the OSM credit is always visible.
        controls: defaultControls({ attributionOptions: { collapsible: false } }),
        layers: [createBasemapLayer(reportTileEvent), placesLayer],
        view: new View({
          center: fromLonLat(CARY_CENTER),
          zoom: 12,
        }),
      })
    } catch (err) {
      // The map is optional: search, list and card keep working without it.
      console.error('Map failed to initialise', err)
      reportMapInitFailed()
      return
    }

    const pickOptions = {
      hitTolerance: HIT_TOLERANCE_PX,
      layerFilter: (l: unknown) => l === placesLayer,
    }

    // singleclick (not click) so a double-click to zoom does not also select.
    map.on('singleclick', (e) => {
      const id = map.forEachFeatureAtPixel(e.pixel, (f) => f.getId(), pickOptions)
      if (typeof id === 'string') useAppStore.getState().setSelectedPlaceId(id)
    })

    map.on('pointermove', (e) => {
      if (e.dragging) return
      const target = map.getTargetElement()
      if (target) target.style.cursor = map.hasFeatureAtPixel(e.pixel, pickOptions) ? 'pointer' : ''
    })

    const resizeObserver = new ResizeObserver(() => map.updateSize())
    resizeObserver.observe(container)

    mapRef.current = map
    layerRef.current = placesLayer

    return () => {
      resizeObserver.disconnect()
      mapRef.current = null
      layerRef.current = null
      flownIdRef.current = null
      map.setTarget(undefined)
      map.dispose()
      resetMapStatus()
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

  // Restyle the pins when the selection changes.
  useEffect(() => {
    selectedIdRef.current = selectedPlaceId
    layerRef.current?.changed()
  }, [selectedPlaceId])

  // Fly to the selected place only when the selection changes, not on data or layout updates.
  useEffect(() => {
    if (selectedPlaceId === flownIdRef.current) return
    if (selectedPlaceId === null) {
      flownIdRef.current = null
      return
    }
    const map = mapRef.current
    const place = allPlaces.find((p) => p.id === selectedPlaceId)
    // Places may not have loaded yet. Leave the id unflown so this runs again when they arrive.
    if (!map || !place) return
    flownIdRef.current = selectedPlaceId
    const padding = selectionPadding(isDesktop, useAppStore.getState().sheetState)
    flyToPlace(map, fromLonLat(place.centroid), padding)
  }, [selectedPlaceId, allPlaces, isDesktop])

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        role="region"
        aria-label="Places map; all places are also available in the list view"
        tabIndex={0}
        className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
      />
      <MapNotes />
    </div>
  )
}
