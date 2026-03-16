import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TIER_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2, legend: 3 }

// GET /api/download?id=<download_id>
// Validates user plan, then proxies the GitHub release asset download
export async function GET(req: NextRequest) {
  // 1. Auth check
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Get download record
  const downloadId = req.nextUrl.searchParams.get('id')
  if (!downloadId) return NextResponse.json({ error: 'Missing download id' }, { status: 400 })

  const { data: dl, error: dlError } = await admin
    .from('downloads')
    .select('*')
    .eq('id', downloadId)
    .eq('is_active', true)
    .single()

  if (dlError || !dl) return NextResponse.json({ error: 'Download not found' }, { status: 404 })

  // 3. Check user has required plan tier
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

  // 4. Resolve download URL
  // Priority: file_url > github_repo (with token for private)
  let downloadUrl = dl.file_url

  if (!downloadUrl && dl.github_repo) {
    if (dl.is_github_private && dl.github_token) {
      // For private repos: resolve the latest release asset URL via GitHub API
      // then proxy stream it with the token
      const assetUrl = await resolveGitHubAssetUrl(dl.github_repo, dl.github_token)
      if (!assetUrl) return NextResponse.json({ error: 'Could not resolve release asset' }, { status: 502 })
      return proxyDownload(assetUrl, dl.github_token, dl.name)
    } else {
      // Public repo: redirect directly
      downloadUrl = dl.github_repo
    }
  }

  if (!downloadUrl) return NextResponse.json({ error: 'No download available' }, { status: 404 })

  // Public URL: just redirect
  return NextResponse.redirect(downloadUrl)
}

// Resolve the actual .exe asset URL from a GitHub releases page URL
async function resolveGitHubAssetUrl(repoUrl: string, token: string): Promise<string | null> {
  try {
    // Extract owner/repo from URL like:
    // https://github.com/owner/repo/releases/latest
    // https://github.com/owner/repo/releases/latest/download/file.exe
    const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/)
    if (!match) return null

    const ownerRepo = match[1].replace(/\/releases.*$/, '')

    // Check if URL already has a specific filename
    const filenameMatch = repoUrl.match(/\/download\/(.+\.exe)$/)
    if (filenameMatch) {
      // Direct asset URL — convert to API URL
      const filename = filenameMatch[1]
      return await resolveAssetByFilename(ownerRepo, filename, token)
    }

    // Get latest release and find the installer asset
    const apiUrl = `https://api.github.com/repos/${ownerRepo}/releases/latest`
    const res = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'StreamVibe-Website',
      }
    })

    if (!res.ok) return null
    const release = await res.json()

    // Find the installer asset (prefer 'latest' fixed name, fallback to any .exe)
    const assets: any[] = release.assets || []
    const latestAsset = assets.find((a: any) => a.name === 'StreamVibe-GiftCreator-Setup-latest.exe')
      || assets.find((a: any) => a.name.endsWith('.exe'))

    return latestAsset?.url || null // This is the API URL, not browser_download_url
  } catch {
    return null
  }
}

async function resolveAssetByFilename(ownerRepo: string, filename: string, token: string): Promise<string | null> {
  const res = await fetch(`https://api.github.com/repos/${ownerRepo}/releases/latest`, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'StreamVibe-Website' }
  })
  if (!res.ok) return null
  const release = await res.json()
  const asset = (release.assets || []).find((a: any) => a.name === filename)
  return asset?.url || null
}

// Stream the GitHub asset through our server (required for private repos)
async function proxyDownload(assetApiUrl: string, token: string, filename: string) {
  const res = await fetch(assetApiUrl, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/octet-stream',
      'User-Agent': 'StreamVibe-Website',
    },
    redirect: 'follow',
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch release asset from GitHub' }, { status: 502 })
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9\-_.]/g, '-') + '-Setup.exe'

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Content-Length': res.headers.get('content-length') || '',
      'Cache-Control': 'no-store',
    },
  })
}
