import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, adminSupabase } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth(req, 'discord:sync')
  if (!auth.authorized) return auth.error!

  try {
    const { user_id, discord_user_id, guild_id } = await req.json()
    if (!discord_user_id || !guild_id) {
      return NextResponse.json({ error: 'discord_user_id and guild_id are required' }, { status: 400 })
    }

    const { data: config } = await adminSupabase.from('discord_config').select('*').eq('guild_id', guild_id).single()
    if (!config?.bot_token) return NextResponse.json({ error: 'No Discord bot configured for this guild' }, { status: 404 })

    const tierRoleMap: Record<string, string> = config.tier_role_map || {}
    const TIERS = ['free', 'basic', 'pro', 'legend']

    let highestTier = 'free'
    if (user_id) {
      const { data: userPlans } = await adminSupabase.from('user_plans').select('expires_at, plans(tier)').eq('user_id', user_id)
      const tierRank: Record<string, number> = { free: 0, basic: 1, pro: 2, legend: 3 }
      const active = (userPlans || []).filter((up: any) => !up.expires_at || new Date(up.expires_at) > new Date())
      highestTier = active.reduce((best: string, up: any) => {
        const t = (up.plans as any)?.tier || 'free'
        return (tierRank[t] || 0) > (tierRank[best] || 0) ? t : best
      }, 'free')
    }

    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guild_id}/members/${discord_user_id}`, {
      headers: { Authorization: `Bot ${config.bot_token}` }
    })
    if (!memberRes.ok) return NextResponse.json({ error: `Discord API error: ${await memberRes.text()}` }, { status: 502 })
    const member = await memberRes.json()
    const currentRoles: string[] = member.roles || []

    const rolesAdded: string[] = []
    const rolesRemoved: string[] = []
    let updatedRoles = [...currentRoles]

    for (const tier of TIERS) {
      const roleId = tierRoleMap[tier]
      if (!roleId) continue
      const shouldHave = tier === highestTier
      const hasRole = currentRoles.includes(roleId)
      if (shouldHave && !hasRole) { updatedRoles.push(roleId); rolesAdded.push(roleId) }
      if (!shouldHave && hasRole) { updatedRoles = updatedRoles.filter(r => r !== roleId); rolesRemoved.push(roleId) }
    }

    if (rolesAdded.length > 0 || rolesRemoved.length > 0) {
      const patchRes = await fetch(`https://discord.com/api/v10/guilds/${guild_id}/members/${discord_user_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bot ${config.bot_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: updatedRoles }),
      })
      if (!patchRes.ok) return NextResponse.json({ error: `Failed to update roles: ${await patchRes.text()}` }, { status: 502 })
    }

    if (user_id) await adminSupabase.from('profiles').update({ discord_user_id }).eq('id', user_id)
    await adminSupabase.from('discord_sync_log').insert({
      user_id: user_id || null, discord_user_id, guild_id,
      roles_added: rolesAdded, roles_removed: rolesRemoved, status: 'success',
    })

    return NextResponse.json({ success: true, discord_user_id, guild_id, highest_tier: highestTier, roles_added: rolesAdded, roles_removed: rolesRemoved })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
