import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPayPalAccessToken, PAYPAL_BASE } from '@/lib/paypal'

export async function POST(req: NextRequest) {
  try {
    const { plan_id, user_id } = await req.json()
    if (!plan_id || !user_id) {
      return NextResponse.json({ error: 'Missing plan_id or user_id' }, { status: 400 })
    }

    // Fetch plan details from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: plan, error } = await supabase
      .from('plans').select('id, name, price, tier, billing_interval').eq('id', plan_id).single()

    if (error || !plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    if (plan.price === 0) return NextResponse.json({ error: 'Free plan does not require payment' }, { status: 400 })

    const accessToken = await getPayPalAccessToken()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://streamvibe.vercel.app'

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: `${user_id}:${plan_id}`,
          description: `StreamVibe — ${plan.name}`,
          amount: {
            currency_code: 'USD',
            value: plan.price.toFixed(2),
          },
        }],
        application_context: {
          brand_name: 'StreamVibe',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${siteUrl}/billing?paypal=success&plan=${plan_id}`,
          cancel_url: `${siteUrl}/billing?paypal=cancel`,
        },
      }),
    })

    if (!orderRes.ok) {
      const err = await orderRes.text()
      return NextResponse.json({ error: `PayPal error: ${err}` }, { status: 500 })
    }

    const order = await orderRes.json()
    return NextResponse.json({ order_id: order.id, status: order.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
