import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAdminUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return null
  const role = user.app_metadata?.role || user.user_metadata?.role
  return role === 'admin' ? user : null
}

// GET /api/admin/tool-bans?user_id=... — list bans for a user
// GET /api/admin/tool-bans — list all active bans
export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser(req)
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = req.nextUrl.searchParams.get('user_id')

  let query = admin
    .from('tool_bans')
    .select(`
      id, user_id, tool, reason, proof, proof_type,
      banned_at, is_active, unbanned_at, notes,
      profiles!tool_bans_user_id_fkey(username, email:id)
    `)
    .order('banned_at', { ascending: false })

  if (userId) query = query.eq('user_id', userId)
  else query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bans: data })
}

// POST /api/admin/tool-bans — create a ban
export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser(req)
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { user_id, reason, proof, proof_type, tool = 'auction', notes } = body

  if (!user_id || !reason) {
    return NextResponse.json({ error: 'user_id and reason required' }, { status: 400 })
  }

  // Deactivate any existing ban for this user+tool first
  await admin.from('tool_bans')
    .update({ is_active: false })
    .eq('user_id', user_id).eq('tool', tool).eq('is_active', true)

  const { data, error } = await admin.from('tool_bans').insert({
    user_id, tool, reason, proof, proof_type, notes,
    banned_by: adminUser.id, is_active: true
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ban: data })
}

// PATCH /api/admin/tool-bans — unban
export async function PATCH(req: NextRequest) {
  const adminUser = await getAdminUser(req)
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ban_id } = await req.json()
  if (!ban_id) return NextResponse.json({ error: 'ban_id required' }, { status: 400 })

  const { error } = await admin.from('tool_bans').update({
    is_active: false,
    unbanned_at: new Date().toISOString(),
    unbanned_by: adminUser.id,
  }).eq('id', ban_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
