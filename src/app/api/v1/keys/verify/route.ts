import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/api-auth'

// POST /api/v1/keys/verify — public endpoint, no API key needed
// Used by desktop apps to verify a license key
export async function POST(req: NextRequest) {
  try {
    const { key_code, hwid, app_version, platform } = await req.json()
    if (!key_code) return NextResponse.json({ valid: false, reason: 'Missing key_code' }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'

    const { data: key, error } = await adminSupabase
      .from('license_keys')
      .select('id, key_code, status, plan_id, user_id, hwid, ip_address, expires_at, plans(name, tier, features, billing_interval)')
      .eq('key_code', key_code.trim().toUpperCase())
      .single()

    if (error || !key) return NextResponse.json({ valid: false, reason: 'Key not found' }, { status: 404 })
    if (key.status === 'banned')   return NextResponse.json({ valid: false, reason: 'Key is banned. Contact support.' }, { status: 403 })
    if (key.status === 'inactive') return NextResponse.json({ valid: false, reason: 'Key has not been activated yet.' }, { status: 403 })
    if (key.status === 'expired')  return NextResponse.json({ valid: false, reason: 'Key has expired.' }, { status: 403 })

    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      await adminSupabase.from('license_keys').update({ status: 'expired' }).eq('id', key.id)
      return NextResponse.json({ valid: false, reason: 'Key has expired.' }, { status: 403 })
    }
    if (key.hwid && hwid && key.hwid !== hwid) {
      return NextResponse.json({ valid: false, reason: 'Hardware ID mismatch. Contact support to reset.' }, { status: 403 })
    }
    if (!key.hwid && hwid) {
      await adminSupabase.from('license_keys').update({ hwid, ip_address: ip }).eq('id', key.id)
    }

    const plan = key.plans as any
    return NextResponse.json({
      valid: true,
      key_code: key.key_code,
      status: key.status,
      tier: plan?.tier || 'free',
      plan_name: plan?.name || null,
      features: plan?.features || [],
      billing_interval: plan?.billing_interval || null,
      expires_at: key.expires_at,
      hwid_locked: !!key.hwid,
      user_id: key.user_id,
    })
  } catch (e: any) {
    return NextResponse.json({ valid: false, reason: 'Server error' }, { status: 500 })
  }
}
