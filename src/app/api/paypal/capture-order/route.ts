import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPayPalAccessToken, PAYPAL_BASE } from '@/lib/paypal'

export async function POST(req: NextRequest) {
  try {
    const { order_id, plan_id, user_id } = await req.json()
    if (!order_id || !plan_id || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Capture the PayPal order
    const accessToken = await getPayPalAccessToken()
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!captureRes.ok) {
      const err = await captureRes.text()
      return NextResponse.json({ error: `PayPal capture failed: ${err}` }, { status: 500 })
    }

    const capture = await captureRes.json()
    if (capture.status !== 'COMPLETED') {
      return NextResponse.json({ error: `Payment not completed: ${capture.status}` }, { status: 400 })
    }

    // Payment confirmed — activate plan in Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: plan } = await supabase
      .from('plans').select('duration_days').eq('id', plan_id).single()

    const expiresAt = plan?.duration_days
      ? new Date(Date.now() + plan.duration_days * 86400000).toISOString()
      : null // null = lifetime

    const { error: insertError } = await supabase.from('user_plans').insert({
      user_id,
      plan_id,
      expires_at: expiresAt,
    })

    if (insertError) {
      // Log but don't fail — payment was captured, manual recovery possible
      console.error('Failed to insert user_plan after PayPal capture:', insertError)
      return NextResponse.json({ success: true, warning: 'Payment captured but plan activation failed — contact support' })
    }

    return NextResponse.json({
      success: true,
      message: 'Payment successful! Your plan has been activated.',
      expires_at: expiresAt,
      paypal_order_id: order_id,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
