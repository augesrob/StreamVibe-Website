import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TIER_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2, legend: 3 }

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  // Look up user by overlay token
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('overlay_token', token)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Check they have Basic+ plan
  const { data: plans } = await supabaseAdmin
    .from('user_plans')
    .select('plans(tier)')
    .eq('user_id', profile.id)

  const highestTier = (plans || []).reduce((best: string, up: any) => {
    const t = up.plans?.tier || 'free'
    return (TIER_RANK[t] || 0) > (TIER_RANK[best] || 0) ? t : best
  }, 'free')

  if (TIER_RANK[highestTier] < TIER_RANK['basic']) {
    return NextResponse.json({ error: 'Basic plan or above required' }, { status: 403 })
  }

  return NextResponse.json({ userId: profile.id, tier: highestTier })
}
