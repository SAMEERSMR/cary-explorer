// Place panel entry point: side panel on desktop, bottom sheet on mobile.
import { useIsDesktop } from '../../lib/useIsDesktop'
import { DesktopPanel } from './DesktopPanel'
import { MobilePanel } from './MobilePanel'

export function PlacePanel() {
  return useIsDesktop() ? <DesktopPanel /> : <MobilePanel />
}
