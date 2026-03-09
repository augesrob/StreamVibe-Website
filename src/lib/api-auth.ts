import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ApiPermission =
  | 'keys:read' | 'keys:create' | 'keys:modify'
  | 'users:read' | 'users:modify'
  | 'discord:sync' | 'discord:config'
  | 'admin'

export interface ApiAuthResult {
  authorized: boolean
  apiKey?: { id: string; name: string; permissions: string[]; owner_user_id: string | null }
  error?: NextResponse
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const bytes = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
  const raw = 'sv_' + Buffer.from(bytes).toString('base64url')
  const prefix = raw.slice(0, 10)
  const hash = hashApiKey(raw)
  return { raw, prefix, hash }
}

export async function requireApiAuth(
  req: NextRequest,
  ...permissions: ApiPermission[]
): Promise<ApiAuthResult> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Missing Authorization header. Use: Authorization: Bearer sv_...' },
        { status: 401 }
      ),
    }
  }

  const raw = authHeader.slice(7)
  const hash = hashApiKey(raw)

  const { data: key, error } = await supabase
    .from('api_keys')
    .select('id, name, permissions, owner_user_id, is_active, expires_at')
    .eq('key_hash', hash)
    .single()

  if (error || !key) {
    return { authorized: false, error: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }) }
  }
  if (!key.is_active) {
    return { authorized: false, error: NextResponse.json({ error: 'API key is disabled' }, { status: 403 }) }
  }
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { authorized: false, error: NextResponse.json({ error: 'API key has expired' }, { status: 403 }) }
  }

  // Check permissions — 'admin' grants everything
  if (permissions.length > 0 && !key.permissions.includes('admin')) {
    const missing = permissions.filter(p => !key.permissions.includes(p))
    if (missing.length > 0) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: `Missing permissions: ${missing.join(', ')}` },
          { status: 403 }
        ),
      }
    }
  }

  // Update last_used_at async (don't await)
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id)

  return { authorized: true, apiKey: key }
}

export { supabase as adminSupabase }
