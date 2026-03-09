import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const { key_code, hwid, app_version, platform } = await req.json()
    if (!key_code) return NextResponse.json({ valid: false, reason: 'Missing key_code' }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'

    const { data: key, error } = await adminSupabase
      .from('license_keys')
      .select('id, key_code, status, plan_id, user_id, hwid, hwid_device_count, hwid_locked, max_devices, ip_address, expires_at, plans(name, tier, features, billing_interval)')
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

    // HWID multi-device logic
    if (hwid) {
      const { data: existingDevice } = await adminSupabase
        .from('key_hwid_log').select('id, is_blocked').eq('key_id', key.id).eq('hwid', hwid).single()

      if (existingDevice) {
        if (existingDevice.is_blocked) {
          return NextResponse.json({ valid: false, reason: 'This device has been blocked for this key. Contact support.' }, { status: 403 })
        }
        // Update last seen
        await adminSupabase.from('key_hwid_log').update({ last_seen_at: new Date().toISOString(), ip_address: ip }).eq('id', existingDevice.id)
      } else {
        // New device — check limit
        const maxDevices = key.max_devices || 5
        const currentCount = key.hwid_device_count || 0
        if (key.hwid_locked || currentCount >= maxDevices) {
          return NextResponse.json({
            valid: false,
            reason: `Device limit reached (${maxDevices} devices max). Contact support to reset your devices.`,
            device_limit_reached: true,
          }, { status: 403 })
        }
        // Register new device
        await adminSupabase.from('key_hwid_log').insert({ key_id: key.id, hwid, ip_address: ip })
        await adminSupabase.from('license_keys').update({
          hwid_device_count: currentCount + 1,
          hwid: key.hwid || hwid, // keep first HWID for legacy compat
          ip_address: key.ip_address || ip,
          hwid_locked: (currentCount + 1) >= maxDevices,
        }).eq('id', key.id)
      }
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
      device_count: key.hwid_device_count || 0,
      max_devices: key.max_devices || 5,
      hwid_locked: key.hwid_locked || false,
      user_id: key.user_id,
    })
  } catch (e: any) {
    return NextResponse.json({ valid: false, reason: 'Server error' }, { status: 500 })
  }
}
