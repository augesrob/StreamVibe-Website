import { NextRequest, NextResponse } from 'next/server'
import { getPayPalAccessToken } from '@/lib/paypal'
import { adminSupabase } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  try {
    const { order_id, plan_id, user_id } = await req.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const accessToken = await getPayPalAccessToken()
    const res = await fetch(`${process.env.PAYPAL_BASE_URL || 'https://api-m.paypal.com'}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json()
    if (!res.ok || data.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Payment not completed', details: data }, { status: 400 })
    }

    const payer = data.payer
    const unit = data.purchase_units?.[0]
    const amount = parseFloat(unit?.payments?.captures?.[0]?.amount?.value || '0')

    // Log the PayPal order
    await adminSupabase.from('paypal_orders').upsert({
      order_id, user_id: user_id || null, plan_id: plan_id || null,
      amount, currency: 'USD', status: 'completed',
      payer_email: payer?.email_address || null,
      payer_name: `${payer?.name?.given_name || ''} ${payer?.name?.surname || ''}`.trim() || null,
      captured_at: new Date().toISOString(),
    }, { onConflict: 'order_id' })

    // Grant plan to user
    let expiresAt = null
    if (user_id && plan_id) {
      const { data: plan } = await adminSupabase.from('plans').select('duration_days').eq('id', plan_id).single()
      expiresAt = plan?.duration_days ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null
      await adminSupabase.from('user_plans').insert({ user_id, plan_id, expires_at: expiresAt })
    }

    return NextResponse.json({ success: true, expires_at: expiresAt, order_id, amount })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
