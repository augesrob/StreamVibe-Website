import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, adminSupabase } from '@/lib/api-auth'

// GET /api/v1/discord/config — get Discord guild config
export async function GET(req: NextRequest) {
  const auth = await requireApiAuth(req, 'discord:config')
  if (!auth.authorized) return auth.error!

  const { searchParams } = new URL(req.url)
  const guildId = searchParams.get('guild_id')

  const query = guildId
    ? adminSupabase.from('discord_config').select('id, guild_id, tier_role_map, created_at, updated_at').eq('guild_id', guildId).single()
    : adminSupabase.from('discord_config').select('id, guild_id, tier_role_map, created_at, updated_at')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT /api/v1/discord/config — upsert Discord guild config
export async function PUT(req: NextRequest) {
  const auth = await requireApiAuth(req, 'discord:config')
  if (!auth.authorized) return auth.error!

  const body = await req.json().catch(() => ({}))
  const { guild_id, bot_token, tier_role_map } = body
  if (!guild_id) return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })

  const updates: Record<string, any> = { guild_id, updated_at: new Date().toISOString() }
  if (bot_token !== undefined) updates.bot_token = bot_token
  if (tier_role_map !== undefined) updates.tier_role_map = tier_role_map

  const { data, error } = await adminSupabase
    .from('discord_config')
    .upsert(updates, { onConflict: 'guild_id' })
    .select('id, guild_id, tier_role_map, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, config: data })
}
