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

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const [
    { count: users },
    { count: totalKeys },
    { count: activeKeys },
    { count: activePlans },
    { data: revenueData }
  ] = await Promise.all([
    adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
    adminSupabase.from('license_keys').select('*', { count: 'exact', head: true }),
    adminSupabase.from('license_keys').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    adminSupabase.from('user_plans').select('*', { count: 'exact', head: true }),
    adminSupabase.from('paypal_orders').select('amount').eq('status', 'completed'),
  ])

  const revenue = (revenueData || []).reduce((sum: number, o: any) => sum + (o.amount || 0), 0)
  return NextResponse.json({ users, totalKeys, activeKeys, activePlans, revenue })
}
