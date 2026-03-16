import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/api-auth'
import { createClient } from '@supabase/supabase-js'

async function getCallerUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await userClient.auth.getUser(token)
  return user
}

function generateKeyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `SV-${seg()}-${seg()}-${seg()}-${seg()}`
}

export async function POST(req: NextRequest) {
  const caller = await getCallerUser(req)
  if (!caller || caller.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const { user_id, plan_id } = await req.json()
  if (!user_id || !plan_id) return NextResponse.json({ error: 'user_id and plan_id required' }, { status: 400 })

  const { data: plan } = await adminSupabase.from('plans').select('duration_days, tier').eq('id', plan_id).single()
  const expiresAt = plan?.duration_days ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null

  // Insert user_plan record
  const { error: planError } = await adminSupabase.from('user_plans').insert({ user_id, plan_id, expires_at: expiresAt })
  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 })

  // Generate a license key for this user+plan and mark it as active/redeemed
  let keyCode = generateKeyCode()
  // Ensure uniqueness (retry once on collision)
  const { data: existing } = await adminSupabase.from('license_keys').select('id').eq('key_code', keyCode).maybeSingle()
  if (existing) keyCode = generateKeyCode()

  const { error: keyError } = await adminSupabase.from('license_keys').insert({
    key_code: keyCode,
    user_id,
    plan_id,
    status: 'active',
    expires_at: expiresAt,
    redeemed_at: new Date().toISOString(),
    max_devices: 3,
    hwid_device_count: 0,
    hwid_locked: false,
    notes: 'Admin granted'
  })
  if (keyError) return NextResponse.json({ error: keyError.message }, { status: 500 })

  return NextResponse.json({ success: true, key_code: keyCode })
}

export async function DELETE(req: NextRequest) {
  const caller = await getCallerUser(req)
  if (!caller || caller.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const { plan_row_id } = await req.json()
  if (!plan_row_id) return NextResponse.json({ error: 'plan_row_id required' }, { status: 400 })
  const { error } = await adminSupabase.from('user_plans').delete().eq('id', plan_row_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
