// Top-level layout: full-screen map with the place panel (side panel on desktop, bottom sheet on mobile).
import { MapView } from '../features/map/MapView'
import { PlacePanel } from '../features/places/PlacePanel'

export default function App() {
  return (
    <main className="relative h-dvh w-screen overflow-hidden">
      <MapView />
      <PlacePanel />
    </main>
  )
}
