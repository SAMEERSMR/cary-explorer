// Top-level layout: full-screen map with a desktop side panel slot and a mobile bottom sheet slot.
import { MapView } from '../features/map/MapView'

export default function App() {
  return (
    <div className="relative h-dvh w-screen overflow-hidden">
      <MapView />

      {/* Desktop side panel slot (~380px) */}
      <aside className="absolute inset-y-0 left-0 hidden w-[380px] overflow-y-auto border-r border-neutral-200 bg-white/95 p-4 shadow-lg md:block" />

      {/* Mobile bottom sheet slot */}
      <div className="absolute inset-x-0 bottom-0 max-h-[45dvh] overflow-y-auto rounded-t-2xl bg-white/95 p-4 shadow-lg md:hidden" />
    </div>
  )
}
