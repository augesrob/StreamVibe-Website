import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, adminSupabase, generateApiKey } from '@/lib/api-auth'

const ALL_PERMISSIONS = ['keys:read', 'keys:create', 'keys:modify', 'users:read', 'users:modify', 'discord:sync', 'discord:config', 'admin']

// GET /api/v1/apikeys — list API keys (admin only, hashes not returned)
export async function GET(req: NextRequest) {
  const auth = await requireApiAuth(req, 'admin')
  if (!auth.authorized) return auth.error!

  const { data, error } = await adminSupabase
    .from('api_keys')
    .select('id, name, key_prefix, permissions, owner_user_id, last_used_at, expires_at, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/v1/apikeys — create a new API key (admin only)
// Returns the raw key ONCE — store it securely, it cannot be retrieved again
export async function POST(req: NextRequest) {
  const auth = await requireApiAuth(req, 'admin')
  if (!auth.authorized) return auth.error!

  const body = await req.json().catch(() => ({}))
  const { name, permissions = [], expires_at, owner_user_id } = body

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const invalid = permissions.filter((p: string) => !ALL_PERMISSIONS.includes(p))
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Invalid permissions: ${invalid.join(', ')}. Valid: ${ALL_PERMISSIONS.join(', ')}` }, { status: 400 })
  }

  const { raw, prefix, hash } = generateApiKey()

  const { data, error } = await adminSupabase.from('api_keys').insert({
    name, key_hash: hash, key_prefix: prefix,
    permissions, owner_user_id: owner_user_id || null,
    expires_at: expires_at || null,
  }).select('id, name, key_prefix, permissions, expires_at, created_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    message: 'Store this key securely — it will not be shown again.',
    api_key: raw,
    key_prefix: prefix,
    id: data?.id,
    permissions,
  }, { status: 201 })
}

// PATCH /api/v1/apikeys/[id] — enable/disable/update a key
export async function PATCH(req: NextRequest) {
  const auth = await requireApiAuth(req, 'admin')
  if (!auth.authorized) return auth.error!

  const body = await req.json().catch(() => ({}))
  const { id, is_active, permissions, name } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const updates: Record<string, any> = {}
  if (is_active !== undefined) updates.is_active = is_active
  if (permissions) updates.permissions = permissions
  if (name) updates.name = name

  const { data, error } = await adminSupabase.from('api_keys').update(updates).eq('id', id)
    .select('id, name, key_prefix, permissions, is_active').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, key: data })
}
