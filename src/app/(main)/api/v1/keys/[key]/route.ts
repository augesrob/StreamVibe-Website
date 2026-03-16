import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, adminSupabase } from '@/lib/api-auth'

type Params = { params: { key: string } }

// GET /api/v1/keys/[key] — read key details
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireApiAuth(req, 'keys:read')
  if (!auth.authorized) return auth.error!

  const keyCode = params.key.toUpperCase()
  const { data, error } = await adminSupabase
    .from('license_keys')
    .select('id, key_code, status, plan_id, user_id, hwid, ip_address, notes, expires_at, created_at, redeemed_at, plans(name, tier, features)')
    .eq('key_code', keyCode)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Key not found' }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/v1/keys/[key] — modify a key
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireApiAuth(req, 'keys:modify')
  if (!auth.authorized) return auth.error!

  const keyCode = params.key.toUpperCase()
  const body = await req.json().catch(() => ({}))

  // Allowed fields to update
  const allowed = ['status', 'plan_id', 'user_id', 'hwid', 'notes', 'expires_at']
  const updates: Record<string, any> = {}
  for (const field of allowed) {
    if (field in body) updates[field] = body[field]
  }

  // Special action: reset HWID
  if (body.action === 'reset_hwid') {
    updates.hwid = null
    updates.ip_address = null
  }

  // Special action: ban
  if (body.action === 'ban') updates.status = 'banned'
  if (body.action === 'unban') updates.status = 'inactive'
  if (body.action === 'activate') updates.status = 'active'
  if (body.action === 'revoke') updates.status = 'inactive'

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update. Allowed: status, plan_id, user_id, hwid, notes, expires_at, action' }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('license_keys')
    .update(updates)
    .eq('key_code', keyCode)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Key not found' }, { status: 404 })

  return NextResponse.json({ success: true, key: data })
}

// DELETE /api/v1/keys/[key] — hard delete a key (admin only)
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireApiAuth(req, 'keys:modify')
  if (!auth.authorized) return auth.error!

  const keyCode = params.key.toUpperCase()
  const { error } = await adminSupabase.from('license_keys').delete().eq('key_code', keyCode)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, deleted: keyCode })
}
