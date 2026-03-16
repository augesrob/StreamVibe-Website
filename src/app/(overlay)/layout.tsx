import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'StreamVibe Overlay' }

export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
