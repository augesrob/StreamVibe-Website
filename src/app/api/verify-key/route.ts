import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side admin access
// These env vars must be set in Vercel dashboard
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: NextRequest) {
  // Validate env vars at request time, not module load time
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ valid: false, reason: 'Server misconfigured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { key_code, hwid } = await req.json()
    if (!key_code) return NextResponse.json({ valid: false, reason: 'Missing key_code' }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('x-real-ip') || 'unknown'

    const { data: key, error } = await supabase
      .from('license_keys')
      .select('*, plans(*)')
      .eq('key_code', key_code.trim().toUpperCase())
      .single()

    if (error || !key) return NextResponse.json({ valid: false, reason: 'Key not found' }, { status: 404 })
    if (key.status === 'banned')   return NextResponse.json({ valid: false, reason: 'Key is banned' }, { status: 403 })
    if (key.status === 'inactive') return NextResponse.json({ valid: false, reason: 'Key not yet activated' }, { status: 403 })
    if (key.status === 'expired')  return NextResponse.json({ valid: false, reason: 'Key has expired' }, { status: 403 })

    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      await supabase.from('license_keys').update({ status: 'expired' }).eq('id', key.id)
      return NextResponse.json({ valid: false, reason: 'Key has expired' }, { status: 403 })
    }

    if (key.hwid && hwid && key.hwid !== hwid) {
      return NextResponse.json({ valid: false, reason: 'Hardware ID mismatch' }, { status: 403 })
    }

    // Lock HWID on first use
    if (!key.hwid && hwid) {
      await supabase.from('license_keys').update({ hwid, ip_address: ip }).eq('id', key.id)
    }

    return NextResponse.json({
      valid: true,
      tier: (key.plans as any)?.tier || null,
      plan_name: (key.plans as any)?.name || null,
      expires_at: key.expires_at,
      features: (key.plans as any)?.features || [],
    })
  } catch {
    return NextResponse.json({ valid: false, reason: 'Server error' }, { status: 500 })
  }
}
