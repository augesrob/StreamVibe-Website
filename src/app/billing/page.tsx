"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Check, CreditCard, Loader2, CheckCircle2, ArrowRight, Calendar, Key, Sparkles, Zap, Star, Crown, Gift, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Plan {
  id: string; name: string; tier: string; billing_interval: string
  price: number; duration_days: number; features: string[]; custom_note: string | null
}
interface UserPlan { id: string; plan_id: string; expires_at: string | null; plans?: Plan }

const INTERVALS = ['monthly', 'quarterly', 'yearly', 'lifetime'] as const
const TIERS = ['free', 'basic', 'pro', 'legend'] as const
type Interval = typeof INTERVALS[number]
type Tier = typeof TIERS[number]

const tierMeta = {
  free:   { label: 'Free',   icon: Gift,  color: 'text-slate-400',  border: 'border-slate-700',  activeGlow: '' },
  basic:  { label: 'Basic',  icon: Zap,   color: 'text-blue-400',   border: 'border-blue-800',   activeGlow: 'shadow-blue-900/30' },
  pro:    { label: 'Pro',    icon: Star,  color: 'text-cyan-400',   border: 'border-cyan-700',   activeGlow: 'shadow-cyan-900/30' },
  legend: { label: 'Legend', icon: Crown, color: 'text-purple-400', border: 'border-purple-700', activeGlow: 'shadow-purple-900/30' },
}

const intervalLabel: Record<Interval, string> = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', lifetime: 'Lifetime' }

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [userPlans, setUserPlans] = useState<UserPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [interval, setInterval] = useState<Interval>('monthly')
  const [activeTier, setActiveTier] = useState<Tier>('free')

  useEffect(() => { if (!authLoading && !user) router.push('/login') }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('plans').select('*').order('sort_order'),
      supabase.from('user_plans').select('*, plans(*)').eq('user_id', user.id),
    ]).then(([{ data: pd }, { data: ud }]) => {
      setPlans(pd || [])
      setUserPlans(ud || [])
      setLoading(false)
    })
  }, [user])

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return
    setRedeeming(true)
    const { data, error } = await supabase.functions.invoke('redeem-license-key', { body: { key_code: redeemCode.trim() } })
    setRedeeming(false)
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message })
    else if (data?.success) { toast({ title: 'Key Redeemed!', description: data.message }); setRedeemCode('') }
    else toast({ variant: 'destructive', title: 'Invalid Key', description: data?.message || 'Could not redeem key.' })
  }

  const isOwned = (planId: string) =>
    userPlans.some(up => up.plan_id === planId && (!up.expires_at || new Date(up.expires_at) > new Date()))

  const getDaysLeft = (expires: string | null) => {
    if (!expires) return 'Lifetime Access'
    const days = Math.max(0, Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000))
    return `${days} days remaining`
  }

  const planFor = (tier: Tier) =>
    tier === 'free' ? plans.find(p => p.tier === 'free') : plans.find(p => p.tier === tier && p.billing_interval === interval)

  if (authLoading || loading) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen pt-24 px-4 bg-[#08080f] text-white pb-20">
      <div className="max-w-6xl mx-auto space-y-10">
        <div>
          <h1 className="text-3xl font-bold mb-1">Billing &amp; Plans</h1>
          <p className="text-slate-400">Manage your subscription and redeem license keys.</p>
        </div>

        {/* Active Plans */}
        {userPlans.length > 0 && (
          <Card className="bg-[#12121e] border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="w-5 h-5 text-cyan-400" />Your Active Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {userPlans.map(up => (
                  <div key={up.id} className="bg-[#0d0d1a] p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{up.plans?.name || 'Unknown Plan'}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-cyan-400">{getDaysLeft(up.expires_at)}</span>
                      </div>
                    </div>
                    <Badge className="bg-green-900/50 text-green-400 border border-green-800">Active</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Crown className="w-5 h-5 text-purple-400" />Available Plans</h2>

          {/* Interval switcher */}
          <div className="flex mb-6">
            <div className="inline-flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
              {INTERVALS.map(iv => (
                <button key={iv} onClick={() => setInterval(iv)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    interval === iv ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  )}>
                  {intervalLabel[iv]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map(tier => {
              const plan = planFor(tier)
              if (!plan) return null
              const meta = tierMeta[tier]
              const Icon = meta.icon
              const owned = isOwned(plan.id)
              return (
                <Card key={tier} className={cn('flex flex-col bg-[#0d0d1a] border transition-all hover:-translate-y-0.5', meta.border, owned && 'ring-1 ring-green-700')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('inline-flex items-center gap-1 text-xs font-bold', meta.color)}>
                        <Icon className="w-3.5 h-3.5" />{meta.label}
                      </span>
                      {owned && <Badge className="bg-green-900/50 text-green-400 border-green-800 text-[10px]">Owned</Badge>}
                    </div>
                    <p className="text-2xl font-extrabold text-white">{plan.price === 0 ? 'Free' : `$${plan.price}`}</p>
                    <p className="text-xs text-slate-500">
                      {plan.price === 0 ? 'No card needed' : plan.billing_interval === 'lifetime' ? 'one-time' : `/${plan.billing_interval === 'monthly' ? 'mo' : plan.billing_interval === 'quarterly' ? 'qtr' : 'yr'}`}
                    </p>
                    {plan.custom_note && <p className={cn('text-xs font-medium mt-1', meta.color)}>{plan.custom_note}</p>}
                  </CardHeader>
                  <CardContent className="flex-grow pb-3">
                    <ul className="space-y-2">
                      {Array.isArray(plan.features) && plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', meta.color)} />{f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {owned ? (
                      <Button disabled className="w-full text-xs bg-green-900/20 text-green-500 border border-green-900">
                        <Check className="w-3 h-3 mr-1" />Active
                      </Button>
                    ) : (
                      <Button className="w-full text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white group"
                        onClick={() => toast({ title: 'Coming Soon', description: 'Payment integration coming soon!' })}>
                        Purchase <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Redeem Key */}
        <Card className="bg-[#12121e] border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Key className="w-5 h-5 text-purple-400" />Redeem License Key</CardTitle>
            <CardDescription className="text-slate-400">Enter a license key you received to activate a plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="SV-XXXX-XXXX-XXXX-XXXX"
                value={redeemCode}
                onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleRedeem()}
                className="bg-[#0d0d1a] border-slate-700 font-mono tracking-widest text-white flex-1"
              />
              <Button onClick={handleRedeem} disabled={redeeming || !redeemCode.trim()}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white min-w-28 font-bold">
                {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redeem'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="flex gap-4 text-sm">
          <a href="/dashboard" className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
            <ArrowRight className="w-3.5 h-3.5" />Dashboard
          </a>
          <a href="/#pricing" className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
            <ArrowRight className="w-3.5 h-3.5" />Compare Plans
          </a>
        </div>
      </div>
    </div>
  )
}
