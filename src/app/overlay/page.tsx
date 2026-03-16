import { Suspense } from 'react'
import OverlayInner from './OverlayInner'

export default function OverlayPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-black/80 text-white font-mono text-sm">
        Loading overlay...
      </div>
    }>
      <OverlayInner />
    </Suspense>
  )
}
