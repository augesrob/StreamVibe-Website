import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, adminSupabase, generateApiKey } from '@/lib/api-auth'

// POST /api/v1/keys — create a new license key (admin or keys:create)
export async function POST(req: NextRequest) {
  const auth = await requireApiAuth(req, 'keys:create')
  if (!auth.authorized) return auth.error!

  try {
    const body = await req.json().catch(() => ({}))
    const { plan_id, quantity = 1, notes, expires_at } = body

    if (quantity < 1 || quantity > 100) {
      return NextResponse.json({ error: 'quantity must be 1–100' }, { status: 400 })
    }

    const keys = Array.from({ length: quantity }, () => {
      const code = 'SV-' + Array.from({ length: 4 }, () =>
        Math.random().toString(36).toUpperCase().substring(2, 6)
      ).join('-')
      return { key_code: code, status: 'inactive', plan_id: plan_id || null, notes: notes || null, expires_at: expires_at || null }
    })

    const { data, error } = await adminSupabase.from('license_keys').insert(keys).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      created: data?.length,
      keys: data?.map(k => ({ id: k.id, key_code: k.key_code, status: k.status, plan_id: k.plan_id, expires_at: k.expires_at })),
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET /api/v1/keys?status=&tier=&limit=&offset= — list keys (admin)
export async function GET(req: NextRequest) {
  const auth = await requireApiAuth(req, 'keys:read')
  if (!auth.authorized) return auth.error!

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = adminSupabase
    .from('license_keys')
    .select('id, key_code, status, plan_id, user_id, hwid, ip_address, notes, expires_at, created_at, redeemed_at, plans(name, tier)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ total: count, limit, offset, keys: data })
}
