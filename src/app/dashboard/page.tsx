"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { LayoutDashboard, Settings, Download, Loader2, Crown, Key, Calendar, Zap, Star, Gift, Monitor, RotateCcw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserPlan {
  id: string; plan_id: string; expires_at: string | null
  plans?: { name: string; tier: string; features: string[] }
}

interface UserKey {
  id: string; key_code: string; status: string
  hwid_device_count: number; hwid_locked: boolean; max_devices: number
  expires_at: string | null
}

const tierColors: Record<string, string> = {
  free: 'text-slate-400', basic: 'text-blue-400', pro: 'text-cyan-400', legend: 'text-purple-400'
}
const tierIcons: Record<string, any> = { free: Gift, basic: Zap, pro: Star, legend: Crown }

const downloads = [
  { name: 'StreamVibe Desktop', version: 'v1.0.0', tier: 'basic', desc: 'Windows desktop app for TikTok LIVE', ext: '.exe' },
  { name: 'Gift Creator', version: 'v1.0.0', tier: 'basic', desc: 'Automated gift response system', ext: '.exe' },
  { name: 'StreamVibe Mobile', version: 'v1.0.0', tier: 'pro', desc: 'Mobile companion app', ext: '.apk' },
]

const tierRank: Record<string, number> = { free: 0, basic: 1, pro: 2, legend: 3 }

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [userPlans, setUserPlans] = useState<UserPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    supabase.from('user_plans').select('*, plans(name, tier, features)').eq('user_id', user.id)
      .then(({ data }) => { setUserPlans(data || []); setLoadingPlans(false) })
  }, [user])

  const highestTier = userPlans.reduce((best, up) => {
    const t = up.plans?.tier || 'free'
    return (tierRank[t] || 0) > (tierRank[best] || 0) ? t : best
  }, 'free')

  if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>
  if (!user) return null

  const TierIcon = tierIcons[highestTier] || Gift
  const tierColor = tierColors[highestTier] || 'text-slate-400'

  return (
    <div className="min-h-screen pt-24 px-4 pb-20 bg-[#08080f] text-white">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back, <span className="text-white font-medium">{user.user_metadata?.username || user.email}</span></p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-[#12121e] border border-slate-800 p-1 h-auto gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300">
              <LayoutDashboard className="w-4 h-4 mr-2" />Overview
            </TabsTrigger>
            <TabsTrigger value="downloads" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300">
              <Download className="w-4 h-4 mr-2" />Downloads
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300">
              <Monitor className="w-4 h-4 mr-2" />My Devices
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300">
              <Settings className="w-4 h-4 mr-2" />Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile card */}
              <Card className="bg-[#12121e] border-slate-800 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-slate-700">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-cyan-900 text-cyan-300 text-lg font-bold">
                        {(user.user_metadata?.username || user.email || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-bold">{user.user_metadata?.username || 'StreamVibe User'}</p>
                      <p className="text-sm text-slate-400 font-normal">{user.email}</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-[#0d0d1a] rounded-lg">
                    <span className="text-slate-400 text-sm">Account Status</span>
                    <Badge className="bg-green-900/50 text-green-400 border-green-800">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#0d0d1a] rounded-lg">
                    <span className="text-slate-400 text-sm">Member Since</span>
                    <span className="text-white text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Plan card */}
              <Card className="bg-[#12121e] border-slate-800 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TierIcon className={cn('w-5 h-5', tierColor)} />
                    Your Plan
                  </CardTitle>
                  <CardDescription className="text-slate-400">Current subscription status</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingPlans ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /></div>
                  ) : userPlans.length > 0 ? (
                    <div className="space-y-2">
                      {userPlans.map(up => (
                        <div key={up.id} className="p-3 bg-[#0d0d1a] rounded-lg flex justify-between items-center">
                          <div>
                            <p className={cn('font-semibold', tierColors[up.plans?.tier || 'free'])}>{up.plans?.name}</p>
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {up.expires_at ? `Expires ${new Date(up.expires_at).toLocaleDateString()}` : 'Lifetime'}
                            </div>
                          </div>
                          <Badge className="bg-green-900/50 text-green-400 border-green-800 text-xs">Active</Badge>
                        </div>
                      ))}
                      <a href="/billing" className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 mt-2 px-1">
                        <Key className="w-3 h-3" />Manage Plans
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-slate-400 mb-4 text-sm">No active plan. Upgrade to unlock features.</p>
                      <a href="/billing" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-bold hover:from-cyan-700 hover:to-blue-700 transition-all">
                        <Key className="w-4 h-4" />View Plans
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="downloads">
            <Card className="bg-[#12121e] border-slate-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-cyan-400" />Available Downloads</CardTitle>
                <CardDescription className="text-slate-400">Your plan unlocks the following software</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {downloads.map((dl, i) => {
                    const unlocked = tierRank[highestTier] >= tierRank[dl.tier]
                    const DlIcon = tierIcons[dl.tier] || Gift
                    return (
                      <div key={i} className={cn('flex items-center justify-between p-4 rounded-xl border transition-all',
                        unlocked ? 'bg-[#0d0d1a] border-slate-700' : 'bg-[#0a0a12] border-slate-800 opacity-60'
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn('p-2 rounded-lg', unlocked ? 'bg-cyan-950/50' : 'bg-slate-800')}>
                            <DlIcon className={cn('w-5 h-5', unlocked ? tierColors[dl.tier] : 'text-slate-600')} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{dl.name} <span className="text-xs text-slate-500">{dl.version}</span></p>
                            <p className="text-xs text-slate-500">{dl.desc}</p>
                          </div>
                        </div>
                        {unlocked ? (
                          <button className="text-xs px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-bold hover:from-cyan-700 hover:to-blue-700 transition-all" onClick={() => alert('Download coming soon!')}>
                            Download {dl.ext}
                          </button>
                        ) : (
                          <a href="/billing" className={cn('text-xs px-3 py-1.5 rounded-lg font-bold border', tierColors[dl.tier], 'border-current/30 hover:opacity-80')}>
                            Requires {dl.tier.charAt(0).toUpperCase() + dl.tier.slice(1)}
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>          <TabsContent value="devices">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Monitor className="w-5 h-5 text-cyan-400" />My Devices</CardTitle>
                <CardDescription className="text-slate-500">Manage HWID device locks on your license keys. Each key supports up to 5 devices.</CardDescription>
              </CardHeader>
              <CardContent>
                {userKeys.length === 0 && !loadingKeys ? (
                  <div className="text-center py-12">
                    <Monitor className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                    <p className="text-slate-500 mb-4">No keys found on your account.</p>
                    <button onClick={loadUserKeys} className="text-sm text-cyan-400 hover:underline">Load my keys</button>
                  </div>
                ) : loadingKeys ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
                ) : (
                  <div className="space-y-4">
                    {userKeys.map(k => {
                      const pct = Math.round(((k.hwid_device_count || 0) / (k.max_devices || 5)) * 100)
                      const atLimit = (k.hwid_device_count || 0) >= (k.max_devices || 5)
                      return (
                        <div key={k.id} className="bg-[#0d0d1a] rounded-xl border border-slate-800 p-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                            <span className="font-mono text-sm text-white tracking-wider">{k.key_code}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', k.status === 'active' ? 'bg-green-900/40 text-green-400' : 'bg-slate-800 text-slate-400')}>{k.status}</span>
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span className="flex items-center gap-1"><Monitor className="w-3 h-3" />Devices used</span>
                              <span className={atLimit ? 'text-red-400 font-bold' : ''}>{k.hwid_device_count || 0} / {k.max_devices || 5}</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5">
                              <div className={cn("h-1.5 rounded-full transition-all", atLimit ? "bg-red-500" : pct > 60 ? "bg-orange-500" : "bg-cyan-500")} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          {k.hwid_locked && (
                            <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-900/20 border border-orange-900/40 rounded-lg px-3 py-2 mb-3">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />Device limit reached. Reset to use on a new device.
                            </div>
                          )}
                          <button onClick={() => resetMyHwid(k.key_code)} disabled={resettingHwid === k.key_code}
                            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-cyan-700 transition-all disabled:opacity-50">
                            {resettingHwid === k.key_code ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}Reset All Devices
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="settings">
            <Card className="bg-[#12121e] border-slate-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-cyan-400" />Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-[#0d0d1a] rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="text-white font-medium">{user.email}</p>
                </div>
                <div className="p-4 bg-[#0d0d1a] rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Username</p>
                  <p className="text-white font-medium">{user.user_metadata?.username || <span className="text-slate-500 italic">Not set</span>}</p>
                </div>
                <div className="p-4 bg-[#0d0d1a] rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">User ID</p>
                  <p className="font-mono text-xs text-slate-400">{user.id}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
