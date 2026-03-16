import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TIER_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2, legend: 3 }

// File extensions we recognise as downloadable assets
const ASSET_EXTENSIONS = ['.apk', '.exe', '.dmg', '.zip', '.tar.gz', '.pkg', '.msi', '.deb', '.rpm']

export async function GET(req: NextRequest) {

  // 1. Validate user JWT
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Get download record via service role
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const downloadId = req.nextUrl.searchParams.get('id')
  if (!downloadId) return NextResponse.json({ error: 'Missing download id' }, { status: 400 })

  const { data: dl, error: dlError } = await admin
    .from('downloads')
    .select('*')
    .eq('id', downloadId)
    .eq('is_active', true)
    .single()

  if (dlError || !dl) return NextResponse.json({ error: 'Download not found' }, { status: 404 })

  // 3. Plan tier check
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

  // 4. Resolve and serve
  if (dl.file_url) return NextResponse.redirect(dl.file_url)

  if (dl.github_repo) {
    if (dl.is_github_private && dl.github_token) {
      const asset = await resolveLatestAsset(dl.github_repo, dl.github_token)
      if (!asset) return NextResponse.json({ error: 'Could not resolve GitHub release asset' }, { status: 502 })
      return proxyDownload(asset.url, asset.name, dl.github_token)
    }
    // Public repo — redirect to the release page URL stored in github_repo
    // But try to resolve a direct asset URL so the browser downloads instead of navigating
    const asset = await resolveLatestAsset(dl.github_repo, null)
    if (asset) return NextResponse.redirect(asset.browserUrl)
    return NextResponse.redirect(dl.github_repo)
  }

  return NextResponse.json({ error: 'No download available' }, { status: 404 })
}

interface ResolvedAsset {
  url: string        // GitHub API URL (for private proxy)
  browserUrl: string // browser_download_url (for public redirect)
  name: string       // original filename e.g. StreamVibe.Mobile-v24.apk
}

async function resolveLatestAsset(repoUrl: string, token: string | null): Promise<ResolvedAsset | null> {
  try {
    // Extract owner/repo — handle any github.com URL format
    const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/)
    if (!match) return null
    const ownerRepo = match[1].replace(/\/releases.*$/, '').replace(/\.git$/, '')

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'StreamVibe',
    }
    if (token) headers['Authorization'] = `token ${token}`

    const res = await fetch(
      `https://api.github.com/repos/${ownerRepo}/releases/latest`,
      { headers }
    )
    if (!res.ok) return null
    const release = await res.json()
    const assets: any[] = release.assets || []
    if (assets.length === 0) return null

    // If the stored URL already specifies a filename, try to match it first
    const filenameMatch = repoUrl.match(/\/download\/[^\/]+\/([^\/]+)$/)
    if (filenameMatch) {
      const named = assets.find(a => a.name === filenameMatch[1])
      if (named) return { url: named.url, browserUrl: named.browser_download_url, name: named.name }
    }

    // Otherwise pick the first recognised asset type
    const asset = assets.find(a => ASSET_EXTENSIONS.some(ext => a.name.endsWith(ext)))
      ?? assets[0]

    return { url: asset.url, browserUrl: asset.browser_download_url, name: asset.name }
  } catch {
    return null
  }
}

async function proxyDownload(assetApiUrl: string, filename: string, token: string) {
  const res = await fetch(assetApiUrl, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/octet-stream',
      'User-Agent': 'StreamVibe',
    },
    redirect: 'follow',
  })

  if (!res.ok) return NextResponse.json({ error: 'GitHub asset fetch failed' }, { status: 502 })

  // Detect content type from filename
  const contentType = filename.endsWith('.apk') ? 'application/vnd.android.package-archive'
    : filename.endsWith('.dmg') ? 'application/octet-stream'
    : filename.endsWith('.zip') ? 'application/zip'
    : 'application/octet-stream'

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': res.headers.get('content-length') || '',
      'Cache-Control': 'no-store',
    },
  })
}
