// OpenLayers map inside a React component: created once in an effect, disposed on unmount. Shows place points.
import { useEffect, useRef, useState } from 'react'
import 'ol/ol.css'
import './map.css'
import OLMap from 'ol/Map'
import { ScaleLine, defaults as defaultControls } from 'ol/control'
import { defaults as defaultInteractions } from 'ol/interaction'
import { createEmpty, extend as extendExtent } from 'ol/extent'
import View from 'ol/View'
import Feature from 'ol/Feature'
import type { Coordinate } from 'ol/coordinate'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Cluster from 'ol/source/Cluster'
import type { FeatureLike } from 'ol/Feature'
import { fromLonLat } from 'ol/proj'
import { useAppStore } from '../../store/useAppStore'
import type { SheetState } from '../../store/useAppStore'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { desktopSelectionPadding } from '../../lib/layout'
import { useFilteredPlaces } from '../places/useFilteredPlaces'
import { usePlaces } from '../places/usePlaces'
import type { CategoryId, ThemeId } from '../../types/place'
import { createBasemapLayer } from './basemap'
import { MapNotes } from './MapNotes'
import { ICON_SIZE } from '../themes/icons'
import { getClusterStyle, getLabelBorderStyle, getPinStyle } from './pinStyles'
import { reportMapInitFailed, reportTileEvent, resetMapStatus } from './mapStatus'

// Cary, NC as [lon, lat]
const CARY_CENTER: [number, number] = [-78.7811, 35.7915]
const MIN_SELECTED_ZOOM = 14
const SELECT_ANIMATION_MS = 400
const HIT_TOLERANCE_PX = 8
const PEEK_SHEET_PX = 112
const CLUSTER_DISTANCE_PX = 44
const CLUSTER_MIN_DISTANCE_PX = 16
const CLUSTER_MAX_ZOOM = 16
const CONTROL_GAP_PX = 12
const ZOOM_ANIMATION_MS = 200

// Same order as OpenLayers padding: [top, right, bottom, left], in pixels.
type Padding = [number, number, number, number]

// Mobile bottom sheet height for each snap state (peek 112px, half ~50%, full ~90% of the window).
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

// Desktop: the side panel covers the left DESKTOP_PANEL_WIDTH px. Mobile: keep clear of the top edge and the bottom sheet.
function selectionPadding(isDesktop: boolean, panelCollapsed: boolean, sheetState: SheetState = 'peek'): Padding {
  if (isDesktop) return desktopSelectionPadding(panelCollapsed)
  return [120, 24, sheetHeightPx(sheetState) + 24, 24]
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Space the zoom buttons and map credits leave at the bottom: the mobile sheet's height, else none.
function bottomInsetPx(isDesktop: boolean, sheetState: SheetState): number {
  return isDesktop || sheetState === 'full' ? 0 : sheetHeightPx(sheetState)
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

  if (prefersReducedMotion()) {
    view.setCenter(center)
    view.setZoom(zoom)
  } else {
    view.animate({ center, zoom, duration: SELECT_ANIMATION_MS })
  }
}

const zoomButtonClass =
  'pointer-events-auto inline-flex size-11 items-center justify-center bg-white text-ink hover:bg-subtle focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link'

function ZoomButtons({ onZoom }: { onZoom: (delta: number) => void }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-md"
      role="group"
      aria-label="Zoom"
    >
      <button type="button" aria-label="Zoom in" onClick={() => onZoom(1)} className={zoomButtonClass}>
        <svg width={ICON_SIZE.md} height={ICON_SIZE.md} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <div className="h-px bg-line" aria-hidden="true" />
      <button type="button" aria-label="Zoom out" onClick={() => onZoom(-1)} className={zoomButtonClass}>
        <svg width={ICON_SIZE.md} height={ICON_SIZE.md} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  )
}

function useWindowHeightTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const onResize = () => setTick((t) => t + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
}

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<OLMap | null>(null)
  const clusterLayerRef = useRef<VectorLayer<Cluster> | null>(null)
  const baseSourceRef = useRef<VectorSource | null>(null)
  const selectedLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const hoveredIdRef = useRef<string | null>(null)
  // Latest framing inputs for map event handlers created once in the init effect.
  const framingRef = useRef({ isDesktop: true, sheetState: 'peek' as SheetState })
  // Last selection the view flew to, so the fly-to runs only when the selection changes.
  const flownIdRef = useRef<string | null>(null)

  const { places: allPlaces } = usePlaces()
  const { places: visiblePlaces } = useFilteredPlaces()
  const selectedPlaceId = useAppStore((s) => s.selectedPlaceId)
  const sheetState = useAppStore((s) => s.sheetState)
  const isDesktop = useIsDesktop()
  useWindowHeightTick()

  useEffect(() => {
    framingRef.current = { isDesktop, sheetState }
  }, [isDesktop, sheetState])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const baseSource = new VectorSource()
    const clusterSource = new Cluster({
      source: baseSource,
      distance: CLUSTER_DISTANCE_PX,
      minDistance: CLUSTER_MIN_DISTANCE_PX,
    })
    const selectedSource = new VectorSource()

    const pinStyleFor = (f: Feature) => {
      const id = f.getId()
      const state = id !== undefined && id === hoveredIdRef.current ? 'hover' : 'default'
      return getPinStyle(f.get('category') as CategoryId, f.get('theme') as ThemeId, state)
    }

    const clusterLayer = new VectorLayer({
      source: clusterSource,
      style: (feature: FeatureLike) => {
        const members = (feature.get('features') as Feature[] | undefined) ?? []
        return members.length === 1 ? pinStyleFor(members[0]) : getClusterStyle(members.length)
      },
    })

    // The selected place is drawn here, on top, and kept out of the cluster source.
    const selectedLayer = new VectorLayer({
      source: selectedSource,
      zIndex: 10,
      style: (feature: FeatureLike) => {
        const name = feature.get('name') as string
        return [
          getPinStyle(feature.get('category') as CategoryId, feature.get('theme') as ThemeId, 'selected', name),
          getLabelBorderStyle(name),
        ]
      },
    })

    resetMapStatus()
    let map: OLMap
    try {
      map = new OLMap({
        target: container,
        // Zoom is a React control. Attribution stays uncollapsed so the OSM credit is always visible.
        controls: defaultControls({
          zoom: false,
          rotate: false,
          attributionOptions: { collapsible: false },
        }).extend([new ScaleLine({ units: 'imperial' })]),
        // OpenLayers' default is onFocusOnly: true, which (because the map has a tabindex for keyboard users)
        // ignores wheel and trackpad-pinch input until the map itself has focus. Selecting a place moves focus
        // to the card, so a pinch then zoomed the whole page. The app is full-screen and never scrolls, so the
        // map always takes wheel and pinch input under the pointer. Keyboard pan/zoom still need map focus.
        interactions: defaultInteractions({ onFocusOnly: false }),
        layers: [createBasemapLayer(reportTileEvent), clusterLayer, selectedLayer],
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
      layerFilter: (l: unknown) => l === clusterLayer || l === selectedLayer,
    }

    // singleclick (not click) so a double-click to zoom does not also select.
    map.on('singleclick', (e) => {
      const hit = map.forEachFeatureAtPixel(e.pixel, (f) => f, pickOptions)
      if (!hit) return
      const members = hit.get('features') as Feature[] | undefined
      if (!members) {
        // Selected pin (plain feature).
        const id = hit.getId()
        if (typeof id === 'string') useAppStore.getState().setSelectedPlaceId(id)
        return
      }
      if (members.length === 1) {
        const id = members[0].getId()
        if (typeof id === 'string') useAppStore.getState().setSelectedPlaceId(id)
        return
      }
      const extent = createEmpty()
      for (const m of members) {
        const g = m.getGeometry()
        if (g) extendExtent(extent, g.getExtent())
      }
      const { isDesktop: desktop, sheetState: sheet } = framingRef.current
      map.getView().fit(extent, {
        padding: selectionPadding(desktop, useAppStore.getState().panelCollapsed, sheet),
        maxZoom: CLUSTER_MAX_ZOOM,
        duration: prefersReducedMotion() ? 0 : SELECT_ANIMATION_MS,
      })
    })

    const setHovered = (id: string | null) => {
      if (hoveredIdRef.current === id) return
      hoveredIdRef.current = id
      clusterLayer.changed()
    }

    map.on('pointermove', (e) => {
      if (e.dragging) return
      const hit = map.forEachFeatureAtPixel(e.pixel, (f) => f, pickOptions)
      const target = map.getTargetElement()
      if (target) target.style.cursor = hit ? 'pointer' : ''
      const members = hit?.get('features') as Feature[] | undefined
      const id = members?.length === 1 ? members[0].getId() : undefined
      setHovered(typeof id === 'string' ? id : null)
    })

    const viewport = map.getViewport()
    const onLeave = () => {
      const target = map.getTargetElement()
      if (target) target.style.cursor = ''
      setHovered(null)
    }
    viewport?.addEventListener('pointerleave', onLeave)

    const resizeObserver = new ResizeObserver(() => map.updateSize())
    resizeObserver.observe(container)

    mapRef.current = map
    clusterLayerRef.current = clusterLayer
    baseSourceRef.current = baseSource
    selectedLayerRef.current = selectedLayer

    return () => {
      resizeObserver.disconnect()
      viewport?.removeEventListener('pointerleave', onLeave)
      mapRef.current = null
      clusterLayerRef.current = null
      baseSourceRef.current = null
      selectedLayerRef.current = null
      flownIdRef.current = null
      hoveredIdRef.current = null
      map.setTarget(undefined)
      map.dispose()
      resetMapStatus()
    }
  }, [])

  // Rebuild the point features when places, theme filters or the selection change (map is not recreated).
  // The selected place leaves the cluster source and is drawn from its own layer.
  useEffect(() => {
    const baseSource = baseSourceRef.current
    const selectedSource = selectedLayerRef.current?.getSource()
    if (!baseSource || !selectedSource) return
    const toFeature = (p: (typeof allPlaces)[number]) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat(p.centroid)),
        theme: p.theme,
        category: p.category,
        name: p.name,
      })
      feature.setId(p.id)
      return feature
    }
    baseSource.clear()
    baseSource.addFeatures(visiblePlaces.filter((p) => p.id !== selectedPlaceId).map(toFeature))
    selectedSource.clear()
    const selected = allPlaces.find((p) => p.id === selectedPlaceId)
    if (selected) selectedSource.addFeature(toFeature(selected))
  }, [visiblePlaces, allPlaces, selectedPlaceId])

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
    const padding = selectionPadding(isDesktop, useAppStore.getState().panelCollapsed, useAppStore.getState().sheetState)
    flyToPlace(map, fromLonLat(place.centroid), padding)
  }, [selectedPlaceId, allPlaces, isDesktop])

  const zoomBy = (delta: number) => {
    const view = mapRef.current?.getView()
    if (!view) return
    const zoom = view.getZoom() ?? 12
    const target = zoom + delta
    if (prefersReducedMotion()) view.setZoom(target)
    else view.animate({ zoom: target, duration: ZOOM_ANIMATION_MS })
  }

  const inset = bottomInsetPx(isDesktop, sheetState)
  const hideZoom = !isDesktop && sheetState === 'full'
  const panelCollapsed = useAppStore((s) => s.panelCollapsed)

  return (
    <div
      className="cary-map absolute inset-0"
      data-panel={isDesktop && panelCollapsed ? 'collapsed' : 'open'}
      style={{ '--map-bottom-inset': `${inset}px` } as React.CSSProperties}
    >
      <div
        ref={containerRef}
        role="region"
        aria-label="Places map; all places are also available in the list view"
        tabIndex={0}
        className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link"
      />
      {!hideZoom && (
        <div
          className="pointer-events-none absolute right-4 z-10"
          style={isDesktop ? { top: 16 } : { bottom: inset + CONTROL_GAP_PX + 28 }}
        >
          <ZoomButtons onZoom={zoomBy} />
        </div>
      )}
      <MapNotes />
    </div>
  )
}
