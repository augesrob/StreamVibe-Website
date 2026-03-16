import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: NextRequest) {
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

    const maxDevices = key.max_devices ?? 1
    const hwids: string[] = key.hwid_list ?? (key.hwid ? [key.hwid] : [])

    if (hwid) {
      if (hwids.includes(hwid)) {
        // Known device — just update last seen
        await supabase.from('license_keys').update({ ip_address: ip }).eq('id', key.id)
      } else if (key.hwid_locked) {
        // Locked and unknown device
        return NextResponse.json({ valid: false, reason: 'Device limit reached. Reset HWID in your dashboard.' }, { status: 403 })
      } else if (hwids.length >= maxDevices) {
        // At limit
        return NextResponse.json({
          valid: false,
          reason: `Device limit reached (${maxDevices} device${maxDevices !== 1 ? 's' : ''} allowed). Reset HWID in your dashboard.`
        }, { status: 403 })
      } else {
        // New device, under limit — register it
        const newHwids = [...hwids, hwid]
        await supabase.from('license_keys').update({
          hwid: newHwids[0],          // keep first hwid for backward compat
          hwid_list: newHwids,
          hwid_device_count: newHwids.length,
          ip_address: ip,
          status: key.status === 'inactive' ? 'active' : key.status,
        }).eq('id', key.id)
      }
    }

    return NextResponse.json({
      valid: true,
      tier: (key.plans as any)?.tier || null,
      plan_name: (key.plans as any)?.name || null,
      expires_at: key.expires_at,
      max_devices: maxDevices,
      device_count: hwids.includes(hwid ?? '') ? hwids.length : hwids.length + 1,
      features: (key.plans as any)?.features || [],
    })
  } catch (e) {
    return NextResponse.json({ valid: false, reason: 'Server error' }, { status: 500 })
  }
}
