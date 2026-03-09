"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, AlertCircle, Zap, Star, Crown, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Plan {
  id: string; name: string; tier: string; billing_interval: string
  price: number; duration_days: number; features: string[]
  custom_note: string | null; sort_order: number
}

const INTERVALS = ['monthly', 'quarterly', 'yearly', 'lifetime'] as const
const TIERS = ['free', 'basic', 'pro', 'legend'] as const
type Interval = typeof INTERVALS[number]
type Tier = typeof TIERS[number]

const tierMeta: Record<Tier, { label: string; icon: any; color: string; border: string; badgeBg: string; badgeBorder: string; btnClass: string }> = {
  free: {
    label: 'Free', icon: Gift,
    color: 'text-slate-400', border: 'border-slate-700',
    badgeBg: 'bg-slate-800 text-slate-300', badgeBorder: 'border-slate-600',
    btnClass: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600',
  },
  basic: {
    label: 'Basic', icon: Zap,
    color: 'text-blue-400', border: 'border-blue-900',
    badgeBg: 'bg-blue-950 text-blue-300', badgeBorder: 'border-blue-800',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  pro: {
    label: 'Pro', icon: Star,
    color: 'text-cyan-400', border: 'border-cyan-600',
    badgeBg: 'bg-cyan-950 text-cyan-300', badgeBorder: 'border-cyan-700',
    btnClass: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-900/40',
  },
  legend: {
    label: 'Legend', icon: Crown,
    color: 'text-purple-400', border: 'border-purple-700',
    badgeBg: 'bg-purple-950 text-purple-300', badgeBorder: 'border-purple-700',
    btnClass: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-900/40',
  },
}

const intervalLabel: Record<Interval, string> = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', lifetime: 'Lifetime' }
const intervalSave: Record<Interval, string | null> = { monthly: null, quarterly: 'Save 13%', yearly: 'Save 25%', lifetime: 'Best Value' }

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interval, setInterval] = useState<Interval>('monthly')

  useEffect(() => {
    supabase.from('plans').select('*').order('sort_order').then(({ data, error }) => {
      if (error) setError('Could not load pricing plans.')
      else setPlans(data || [])
      setLoading(false)
    })
  }, [])

  const planFor = (tier: Tier) =>
    tier === 'free'
      ? plans.find(p => p.tier === 'free')
      : plans.find(p => p.tier === tier && p.billing_interval === interval)

  return (
    <section id="pricing" className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/5 blur-[120px] rounded-full" />
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold tracking-widest text-cyan-400 uppercase mb-3 px-3 py-1 rounded-full border border-cyan-900/60 bg-cyan-950/30">Pricing</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Simple,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              Transparent
            </span>{' '}Pricing
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">Start free. Upgrade when you need more.</p>
        </div>

        {/* Interval switcher */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
            {INTERVALS.map(iv => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={cn(
                  'relative px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  interval === iv
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {intervalLabel[iv]}
                {intervalSave[iv] && interval !== iv && (
                  <span className="absolute -top-2.5 -right-1 text-[9px] font-bold bg-green-600 text-white px-1.5 rounded-full leading-4">
                    {intervalSave[iv]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="w-12 h-12 text-cyan-500 animate-spin" /></div>
        ) : error ? (
          <div className="flex justify-center py-24 text-red-400 gap-2 items-center">
            <AlertCircle className="w-5 h-5" />{error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {TIERS.map(tier => {
              const plan = planFor(tier)
              if (!plan) return null
              const meta = tierMeta[tier]
              const Icon = meta.icon
              const isPro = tier === 'pro'
              return (
                <Card key={tier} className={cn(
                  'relative flex flex-col bg-[#0d0d16] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border',
                  meta.border, isPro && 'shadow-lg shadow-cyan-900/20'
                )}>
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-extrabold px-4 py-1 rounded-full tracking-wider shadow-lg">
                      MOST POPULAR
                    </div>
                  )}
                  <CardHeader className="pb-3 pt-6">
                    <div className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border w-fit mb-3', meta.badgeBg, meta.badgeBorder)}>
                      <Icon className="w-3 h-3" />{meta.label}
                    </div>
                    <CardTitle className="text-3xl font-extrabold text-white">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </CardTitle>
                    <CardDescription className="text-slate-500 text-xs mt-1">
                      {plan.price === 0
                        ? 'Always free — no card required'
                        : plan.billing_interval === 'lifetime'
                        ? 'one-time payment'
                        : `billed ${plan.billing_interval}`}
                    </CardDescription>
                    {plan.custom_note && (
                      <p className={cn('text-xs mt-1.5 font-semibold', meta.color)}>{plan.custom_note}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-grow pb-4">
                    <ul className="space-y-2.5">
                      {Array.isArray(plan.features) && plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <Check className={cn('w-4 h-4 shrink-0 mt-0.5', meta.color)} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-2 pb-6">
                    <Button asChild className={cn('w-full font-bold transition-all', meta.btnClass)}>
                      <Link href={tier === 'free' ? '/signup' : '/billing'}>
                        {tier === 'free' ? 'Get Started Free' : `Get ${meta.label}`}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        <div className="text-center mt-12 space-y-3">
          <p className="text-slate-500 text-sm">Already have a license key?</p>
          <Button asChild variant="outline" className="border-slate-700 text-slate-400 hover:text-white hover:border-cyan-500">
            <Link href="/billing">Activate Key</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
