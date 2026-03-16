import { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import OverlayInner from './OverlayInner'

export const metadata: Metadata = { title: 'StreamVibe Overlay' }

// Tell the browser this is a fixed-size canvas
export const viewport: Viewport = {
  width: 1920,
  initialScale: 1,
}

export default function OverlayPage() {
  return (
    <Suspense fallback={null}>
      <OverlayInner />
    </Suspense>
  )
}
