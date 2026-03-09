import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

async function requireAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ).auth.getUser(token)
  return user?.app_metadata?.role === 'admin' ? user : null
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { key_id } = await req.json()
  if (!key_id) return NextResponse.json({ error: 'key_id required' }, { status: 400 })

  const { error } = await adminSupabase
    .from('license_keys')
    .update({ user_id: null, status: 'inactive', hwid: null, hwid_device_count: 0, hwid_locked: false })
    .eq('id', key_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
