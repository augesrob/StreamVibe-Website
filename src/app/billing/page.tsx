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
import { Crown, Check, CreditCard, Loader2, CheckCircle2, ArrowRight, Calendar, Key, Sparkles } from 'lucide-react'

interface Plan { id: string; name: string; price: number; duration_days: number; features: string[] }
interface UserPlan { id: string; plan_id: string; expires_at: string | null; plans?: Plan }

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [userPlans, setUserPlans] = useState<UserPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => { if (!authLoading && !user) router.push('/login') }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      const [{ data: planData }, { data: userPlanData }] = await Promise.all([
        supabase.from('plans').select('*').order('price', { ascending: true }),
        supabase.from('user_plans').select('*, plans(*)').eq('user_id', user.id)
      ])
      setPlans(planData || [])
      setUserPlans(userPlanData || [])
      setLoading(false)
    }
    fetchData()
  }, [user])

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!redeemCode.trim()) return
    setRedeeming(true)
    const { data, error } = await supabase.functions.invoke('redeem-license-key', { body: { key_code: redeemCode.trim() } })
    setRedeeming(false)
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message })
    else if (data?.success) { toast({ title: 'Key Redeemed!', description: data.message }); setRedeemCode('') }
    else toast({ variant: 'destructive', title: 'Failed', description: data?.message || 'Invalid key' })
  }

  const getDaysRemaining = (expires: string | null) => {
    if (!expires) return 'Lifetime'
    const diff = new Date(expires).getTime() - Date.now()
    return `${Math.max(0, Math.ceil(diff / 86400000))} days left`
  }

  const isOwned = (planId: string) => userPlans.some(up => up.plan_id === planId && (!up.expires_at || new Date(up.expires_at) > new Date()))

  if (authLoading || loading) return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>

  return (
    <div className="min-h-screen pt-24 px-4 bg-[#0a0a0f] text-white pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Billing &amp; Subscription</h1>
          <p className="text-gray-400">Manage your plans and redeem license keys.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-[#1a1a24] border-gray-800">
              <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Sparkles className="w-5 h-5 text-cyan-400" /> Your Active Plans</CardTitle></CardHeader>
              <CardContent>
                {userPlans.length > 0 ? (
                  <div className="space-y-3">
                    {userPlans.map(plan => (
                      <div key={plan.id} className="bg-[#12121a] p-4 rounded-lg border border-gray-800 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-white">{plan.plans?.name || 'Unknown'}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                            <Calendar className="w-3 h-3" /><span className="text-cyan-400">{getDaysRemaining(plan.expires_at)}</span>
                          </div>
                        </div>
                        <Badge className="bg-green-900/50 text-green-400 border-green-800">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-center text-gray-400 py-6">No active plans yet.</p>)}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Crown className="w-5 h-5 text-purple-500" /> Available Plans</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map(plan => (
                  <Card key={plan.id} className="bg-[#1a1a24] border-gray-800 text-white flex flex-col relative overflow-hidden">
                    {isOwned(plan.id) && <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5">OWNED</div>}
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <span className="text-cyan-400 font-bold">${plan.price}</span>
                      </div>
                      <CardDescription className="text-xs text-gray-500">{plan.duration_days} days access</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow pb-2">
                      <ul className="space-y-1">
                        {Array.isArray(plan.features) && plan.features.map((f, i) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 text-cyan-500/50 shrink-0 mt-0.5" /><span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="pt-4">
                      {isOwned(plan.id) ? (
                        <Button disabled className="w-full bg-green-900/20 text-green-500 border border-green-900/50"><Check className="w-4 h-4 mr-2" /> Plan Active</Button>
                      ) : (
                        <Button className="w-full bg-[#12121a] hover:bg-cyan-950 border border-gray-700 text-white hover:text-cyan-400 group" onClick={() => toast({ title: 'Payment', description: 'Payment integration coming soon!' })}>
                          Purchase <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
            <Card className="bg-[#1a1a24] border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white"><CreditCard className="w-5 h-5 text-purple-400" /> Redeem License Key</CardTitle>
                <CardDescription className="text-gray-400">Enter your license key or promotional code.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRedeem} className="flex gap-4">
                  <Input placeholder="XXXX-XXXX-XXXX-XXXX" value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())} className="bg-[#12121a] border-gray-700 font-mono tracking-widest text-white" />
                  <Button type="submit" disabled={redeeming || !redeemCode} className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white min-w-[120px]">
                    {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redeem'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="bg-[#1a1a24] border-gray-800">
              <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Key className="w-5 h-5 text-cyan-400" /> Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <a href="/dashboard" className="flex items-center justify-between p-3 bg-[#12121a] rounded-lg hover:bg-slate-800 transition-colors text-sm text-gray-300 hover:text-white">
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </a>
                <a href="/#pricing" className="flex items-center justify-between p-3 bg-[#12121a] rounded-lg hover:bg-slate-800 transition-colors text-sm text-gray-300 hover:text-white">
                  View All Plans <ArrowRight className="w-4 h-4" />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
