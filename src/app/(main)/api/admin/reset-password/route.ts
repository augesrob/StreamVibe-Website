import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  // Verify caller is admin via Supabase JWT
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { createClient } = await import('@supabase/supabase-js')
  const userClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user: caller } } = await userClient.auth.getUser(token)
  if (!caller || caller.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  // Get user email
  const { data: { user }, error } = await adminSupabase.auth.admin.getUserById(user_id)
  if (error || !user?.email) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Send password reset email
  const { error: resetError } = await adminSupabase.auth.admin.generateLink({
    type: 'recovery', email: user.email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/dashboard` }
  })

  if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 })
  return NextResponse.json({ success: true, email: user.email })
}
