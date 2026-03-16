import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TIER_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2, legend: 3 }

export async function GET(req: NextRequest) {

  // ── 1. Validate the user's JWT using the anon client + their token ──
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use the user's own token to verify identity — no service key needed here
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 2. All remaining DB queries use the service role (admin) client ──
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // Get the download record
  const downloadId = req.nextUrl.searchParams.get('id')
  if (!downloadId) return NextResponse.json({ error: 'Missing download id' }, { status: 400 })

  const { data: dl, error: dlError } = await admin
    .from('downloads')
    .select('*')
    .eq('id', downloadId)
    .eq('is_active', true)
    .single()

  if (dlError || !dl) return NextResponse.json({ error: 'Download not found' }, { status: 404 })

  // ── 3. Plan tier check ──
  const { data: plans } = await admin
    .from('user_plans')
    .select('plans(tier)')
    .eq('user_id', user.id)

  const highestTier = (plans || []).reduce((best: string, up: any) => {
    const t = up.plans?.tier || 'free'
    return (TIER_RANK[t] || 0) > (TIER_RANK[best] || 0) ? t : best
  }, 'free')

  const requiredTier = dl.tier || 'basic'
  if (TIER_RANK[highestTier] < TIER_RANK[requiredTier]) {
    return NextResponse.json({
      error: `${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} plan required`
    }, { status: 403 })
  }

  // ── 4. Resolve and serve the file ──
  if (dl.file_url) return NextResponse.redirect(dl.file_url)

  if (dl.github_repo) {
    if (dl.is_github_private && dl.github_token) {
      const assetUrl = await resolveGitHubAssetUrl(dl.github_repo, dl.github_token)
      if (!assetUrl) return NextResponse.json({ error: 'Could not resolve GitHub release asset' }, { status: 502 })
      return proxyDownload(assetUrl, dl.github_token, dl.name)
    }
    return NextResponse.redirect(dl.github_repo)
  }

  return NextResponse.json({ error: 'No download available' }, { status: 404 })
}

async function resolveGitHubAssetUrl(repoUrl: string, token: string): Promise<string | null> {
  try {
    const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/)
    if (!match) return null
    const ownerRepo = match[1].replace(/\/releases.*$/, '')

    // If URL already includes a specific filename, find that asset
    const filenameMatch = repoUrl.match(/\/download\/([^\/]+\.exe)$/)
    const targetFilename = filenameMatch?.[1] ?? 'StreamVibe-GiftCreator-Setup-latest.exe'

    const res = await fetch(
      `https://api.github.com/repos/${ownerRepo}/releases/latest`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'StreamVibe' } }
    )
    if (!res.ok) return null
    const release = await res.json()

    const assets: any[] = release.assets || []
    const asset = assets.find(a => a.name === targetFilename)
      ?? assets.find(a => a.name.endsWith('.exe'))

    // Return the API url (not browser_download_url) — required for private repos
    return asset?.url ?? null
  } catch {
    return null
  }
}

async function proxyDownload(assetApiUrl: string, token: string, name: string) {
  const res = await fetch(assetApiUrl, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/octet-stream',
      'User-Agent': 'StreamVibe',
    },
    redirect: 'follow',
  })

  if (!res.ok) return NextResponse.json({ error: 'GitHub asset fetch failed' }, { status: 502 })

  const filename = name.replace(/[^a-zA-Z0-9\-_.]/g, '-') + '-Setup.exe'

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': res.headers.get('content-length') || '',
      'Cache-Control': 'no-store',
    },
  })
}
