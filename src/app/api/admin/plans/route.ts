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

export async function GET() {
  const { data, error } = await adminSupabase.from('plans').select('*').order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plans: data })
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const body = await req.json()
  const { error, data } = await adminSupabase.from('plans').insert({
    name: body.name, tier: body.tier, billing_interval: body.billing_interval,
    price: body.price, duration_days: body.duration_days || null,
    features: body.features || [], custom_note: body.custom_note || null,
    sort_order: body.sort_order || 0, is_active: body.is_active ?? true,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, plan: data })
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await adminSupabase.from('plans').update(fields).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await adminSupabase.from('plans').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
