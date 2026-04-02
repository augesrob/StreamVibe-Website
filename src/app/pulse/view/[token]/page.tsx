import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PulseViewer from '@/components/pulse/PulseViewer'

const SUPABASE_URL  = 'https://ugodapqlmajfhvrodlyf.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb2RhcHFsbWFqZmh2cm9kbHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjIxNzQsImV4cCI6MjA4ODU5ODE3NH0.LjDDwzac0264ao2PppV2jB5Q1WyACylWyqlgv8ISUfA'

async function getGuide(token: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/pulse_guides?share_token=eq.${token}&select=*`,
    {
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      next: { revalidate: 60 },
    }
  )
  if (!res.ok) return null
  const rows = await res.json()
  return rows?.[0] ?? null
}

export async function generateMetadata(
  { params }: { params: { token: string } }
): Promise<Metadata> {
  const guide = await getGuide(params.token)
  if (!guide) return { title: 'Guide not found — StreamVibe Pulse' }
  return {
    title: `${guide.title} — StreamVibe Pulse`,
    description: guide.description || 'A step-by-step guide created with StreamVibe Pulse',
    openGraph: {
      title: guide.title,
      description: guide.description || '',
      siteName: 'StreamVibe Pulse',
    },
  }
}

export default async function PulseViewPage(
  { params }: { params: { token: string } }
) {
  const guide = await getGuide(params.token)
  if (!guide) notFound()

  return <PulseViewer guide={guide} token={params.token} />
}
