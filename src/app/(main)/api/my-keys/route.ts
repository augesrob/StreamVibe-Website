import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
  // Verify the user's JWT
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use service role to read keys (bypasses RLS)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: keys, error: keysError } = await admin
    .from('license_keys')
    .select('id, key_code, status, hwid_device_count, hwid_locked, max_devices, expires_at, redeemed_at, plans(name, tier)')
    .eq('user_id', user.id)
    .order('redeemed_at', { ascending: false })

  if (keysError) return NextResponse.json({ error: keysError.message }, { status: 500 })
  return NextResponse.json({ keys: keys || [] })
}
