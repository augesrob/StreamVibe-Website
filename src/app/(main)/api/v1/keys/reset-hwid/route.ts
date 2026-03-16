import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

// POST /api/v1/keys/reset-hwid
// Can be called by: admin (any key) OR the key owner via Supabase JWT
export async function POST(req: NextRequest) {
  const { key_code, user_id } = await req.json().catch(() => ({}))
  if (!key_code) return NextResponse.json({ error: 'key_code required' }, { status: 400 })

  // Check if admin API key OR valid user JWT
  const authHeader = req.headers.get('authorization') || ''
  let isAdmin = false
  let requestingUserId: string | null = null

  if (authHeader.startsWith('Bearer sv_')) {
    // API key auth
    const { createHash } = await import('crypto')
    const hash = createHash('sha256').update(authHeader.slice(7)).digest('hex')
    const { data: apiKey } = await adminSupabase.from('api_keys').select('permissions, is_active').eq('key_hash', hash).single()
    if (apiKey?.is_active && (apiKey.permissions.includes('admin') || apiKey.permissions.includes('keys:modify'))) {
      isAdmin = true
    }
  } else if (authHeader.startsWith('Bearer ')) {
    // Supabase JWT
    const userClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await userClient.auth.getUser(authHeader.slice(7))
    if (user) requestingUserId = user.id
  }

  const { data: key } = await adminSupabase.from('license_keys').select('id, user_id, hwid_device_count, key_code').eq('key_code', key_code.toUpperCase()).single()
  if (!key) return NextResponse.json({ error: 'Key not found' }, { status: 404 })

  // Auth check — must be admin or the key owner
  if (!isAdmin && requestingUserId !== key.user_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Clear all HWID device logs for this key
  await adminSupabase.from('key_hwid_log').delete().eq('key_id', key.id)
  await adminSupabase.from('license_keys').update({
    hwid: null, ip_address: null, hwid_device_count: 0, hwid_locked: false,
  }).eq('id', key.id)

  return NextResponse.json({ success: true, message: 'All devices cleared. Key can now be used on new devices.' })
}
