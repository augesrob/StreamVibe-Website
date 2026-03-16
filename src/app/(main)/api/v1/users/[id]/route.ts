import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, adminSupabase } from '@/lib/api-auth'

type Params = { params: { id: string } }

// GET /api/v1/users/[id] — get user profile, plans, keys
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireApiAuth(req, 'users:read')
  if (!auth.authorized) return auth.error!

  const userId = params.id

  const [{ data: profile }, { data: userPlans }, { data: keys }] = await Promise.all([
    adminSupabase.from('profiles').select('id, username, avatar_url, discord_user_id, is_banned, created_at').eq('id', userId).single(),
    adminSupabase.from('user_plans').select('id, plan_id, expires_at, created_at, plans(name, tier, billing_interval)').eq('user_id', userId),
    adminSupabase.from('license_keys').select('id, key_code, status, plan_id, hwid, expires_at, redeemed_at').eq('user_id', userId),
  ])

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Determine highest active tier
  const tierRank: Record<string, number> = { free: 0, basic: 1, pro: 2, legend: 3 }
  const activePlans = (userPlans || []).filter(up =>
    !up.expires_at || new Date(up.expires_at) > new Date()
  )
  const highestTier = activePlans.reduce((best, up) => {
    const t = (up.plans as any)?.tier || 'free'
    return (tierRank[t] || 0) > (tierRank[best] || 0) ? t : best
  }, 'free')

  return NextResponse.json({
    id: profile.id,
    username: profile.username,
    avatar_url: profile.avatar_url,
    discord_user_id: profile.discord_user_id,
    is_banned: profile.is_banned,
    created_at: profile.created_at,
    highest_tier: highestTier,
    active_plans: activePlans,
    all_plans: userPlans,
    license_keys: keys,
  })
}

// PATCH /api/v1/users/[id] — modify user
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireApiAuth(req, 'users:modify')
  if (!auth.authorized) return auth.error!

  const userId = params.id
  const body = await req.json().catch(() => ({}))

  const profileUpdates: Record<string, any> = {}
  if ('username' in body) profileUpdates.username = body.username
  if ('discord_user_id' in body) profileUpdates.discord_user_id = body.discord_user_id
  if ('avatar_url' in body) profileUpdates.avatar_url = body.avatar_url
  if ('is_banned' in body) profileUpdates.is_banned = body.is_banned

  // Special actions
  if (body.action === 'ban') profileUpdates.is_banned = true
  if (body.action === 'unban') profileUpdates.is_banned = false

  let profileResult = null
  if (Object.keys(profileUpdates).length > 0) {
    const { data, error } = await adminSupabase
      .from('profiles').update(profileUpdates).eq('id', userId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    profileResult = data
  }

  // Grant a plan directly
  if (body.grant_plan_id) {
    const { data: plan } = await adminSupabase.from('plans').select('duration_days').eq('id', body.grant_plan_id).single()
    const expiresAt = plan?.duration_days ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null
    await adminSupabase.from('user_plans').insert({ user_id: userId, plan_id: body.grant_plan_id, expires_at: expiresAt })
  }

  // Revoke a plan
  if (body.revoke_plan_id) {
    await adminSupabase.from('user_plans').delete().eq('user_id', userId).eq('plan_id', body.revoke_plan_id)
  }

  return NextResponse.json({ success: true, profile: profileResult, actions: body.action || null })
}
