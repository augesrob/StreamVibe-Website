"use client"
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { LayoutDashboard, Settings, Download, Loader2, Crown, Key, Calendar, Zap, Star, Gift, Monitor, RotateCcw, AlertTriangle, CreditCard, Camera, Lock, Eye, EyeOff, Copy, Check, Wrench, Layers, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserPlan {
  id: string; plan_id: string; expires_at: string | null
  plans?: { name: string; tier: string; features: string[] }
}
interface UserKey {
  id: string; key_code: string; status: string
  hwid_device_count: number; hwid_locked: boolean; max_devices: number
  expires_at: string | null; redeemed_at: string | null
  plans?: { name: string; tier: string } | null
}
interface DownloadItem {
  id: string; name: string; description: string; version: string; tier: string
  file_url: string | null; github_repo: string | null; is_github_private: boolean
  github_token: string | null; last_updated: string | null; sort_order: number; is_active: boolean
}
interface PayPalOrder {
  id: string; order_id: string; amount: number; status: string
  payer_email: string | null; created_at: string; plans?: { name: string } | null
}

const tierColors: Record<string, string> = {
  free: 'text-slate-400', basic: 'text-blue-400', pro: 'text-cyan-400', legend: 'text-purple-400'
}
const tierIcons: Record<string, any> = { free: Gift, basic: Zap, pro: Star, legend: Crown }
const tierRank: Record<string, number> = { free: 0, basic: 1, pro: 2, legend: 3 }

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userPlans, setUserPlans] = useState<UserPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [userKeys, setUserKeys] = useState<UserKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [resettingHwid, setResettingHwid] = useState<string | null>(null)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [billingHistory, setBillingHistory] = useState<PayPalOrder[]>([])
  const [loadingBilling, setLoadingBilling] = useState(false)
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [loadingDownloads, setLoadingDownloads] = useState(true)

  // Settings state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => { if (!loading && !user) router.push('/login') }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    setAvatarUrl(user.user_metadata?.avatar_url || null)
    supabase.from('user_plans').select('*, plans(name, tier, features)').eq('user_id', user.id)
      .then(({ data }) => { setUserPlans(data || []); setLoadingPlans(false) })
    supabase.from('downloads').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { setDownloads(data || []); setLoadingDownloads(false) })
    // Auto-load keys so devices tab works immediately
    setTimeout(() => loadUserKeys(), 100)
  }, [user])

  const highestTier = userPlans.reduce((best, up) => {
    const t = up.plans?.tier || 'free'
    return (tierRank[t] || 0) > (tierRank[best] || 0) ? t : best
  }, 'free')

  const loadUserKeys = async () => {
    if (!user) return
    setLoadingKeys(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { setLoadingKeys(false); return }
      const res = await fetch('/api/my-keys', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const d = await res.json()
      setUserKeys(d.keys || [])
    } catch {
      setUserKeys([])
    } finally {
      setLoadingKeys(false)
    }
  }

  const loadBillingHistory = async () => {
    if (!user) return
    setLoadingBilling(true)
    const { data } = await supabase.from('paypal_orders').select('id, order_id, amount, status, payer_email, created_at, plans(name)').eq('user_id', user.id).order('created_at', { ascending: false })
    setBillingHistory((data as any[]) || [])
    setLoadingBilling(false)
  }

  const resetMyHwid = async (keyCode: string) => {
    setResettingHwid(keyCode)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/v1/keys/reset-hwid', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ key_code: keyCode }) })
    const d = await res.json()
    if (d.success) { toast({ title: 'Devices reset', description: 'All devices cleared.' }); loadUserKeys() }
    else toast({ variant: 'destructive', title: 'Error', description: d.error || 'Contact support.' })
    setResettingHwid(null)
  }

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 8) { toast({ variant: 'destructive', title: 'Password too short', description: 'Minimum 8 characters.' }); return }
    if (newPassword !== confirmPassword) { toast({ variant: 'destructive', title: 'Passwords do not match' }); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message })
    else { toast({ title: 'Password updated successfully' }); setNewPassword(''); setConfirmPassword('') }
    setSavingPassword(false)
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return
    if (file.size > 5 * 1024 * 1024) { toast({ variant: 'destructive', title: 'File too large', description: 'Max 5MB.' }); return }
    setUploadingAvatar(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
        body: fd
      })
      const json = await res.json()
      if (!res.ok) { toast({ variant: 'destructive', title: 'Upload failed', description: json.error }); return }
      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: json.publicUrl } })
      if (updateError) toast({ variant: 'destructive', title: 'Failed to save avatar' })
      else { setAvatarUrl(json.publicUrl + '?t=' + Date.now()); toast({ title: 'Profile picture updated!' }) }
    } finally {
      setUploadingAvatar(false)
    }
  }

  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (dl: DownloadItem) => {
    setDownloading(dl.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({ variant: 'destructive', title: 'Not logged in' })
        return
      }
      const res = await fetch(`/api/download?id=${dl.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download failed' }))
        toast({ variant: 'destructive', title: 'Download failed', description: err.error })
        return
      }
      // Stream to blob and trigger browser save dialog
      const blob = await res.blob()
      const filename = res.headers.get('content-disposition')
        ?.match(/filename="?([^"]+)"?/)?.[1]
        || dl.name.replace(/[^a-zA-Z0-9]/g, '-') + '-Setup.exe'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      toast({ title: '✅ Download started', description: dl.name })
    } catch {
      toast({ variant: 'destructive', title: 'Download failed', description: 'Network error' })
    } finally {
      setDownloading(null)
    }
  }

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
          <TabsList className="bg-[#12121e] border border-slate-800 p-1 h-auto gap-1 flex-wrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300"><LayoutDashboard className="w-4 h-4 mr-2" />Overview</TabsTrigger>
            <TabsTrigger value="tools" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300"><Wrench className="w-4 h-4 mr-2" />Tools</TabsTrigger>
            <TabsTrigger value="downloads" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300"><Download className="w-4 h-4 mr-2" />Downloads</TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300" onClick={() => { if (userKeys.length === 0 && !loadingKeys) loadUserKeys() }}><Monitor className="w-4 h-4 mr-2" />My Devices</TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300" onClick={() => { if (billingHistory.length === 0 && !loadingBilling) loadBillingHistory() }}><CreditCard className="w-4 h-4 mr-2" />Billing</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300"><Settings className="w-4 h-4 mr-2" />Settings</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#12121e] border-slate-800 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-slate-700">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-cyan-900 text-cyan-300 text-lg font-bold">{(user.user_metadata?.username || user.email || 'U')[0].toUpperCase()}</AvatarFallback>
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
                  <div className="flex justify-between items-center p-3 bg-[#0d0d1a] rounded-lg">
                    <span className="text-slate-400 text-sm">Current Tier</span>
                    <span className={cn('font-bold capitalize text-sm', tierColor)}>{highestTier}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#12121e] border-slate-800 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TierIcon className={cn('w-5 h-5', tierColor)} />Your Plan</CardTitle>
                  <CardDescription className="text-slate-400">Current subscription status</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingPlans ? <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /></div>
                  : userPlans.length > 0 ? (
                    <div className="space-y-2">
                      {userPlans.map(up => (
                        <div key={up.id} className="p-3 bg-[#0d0d1a] rounded-lg flex justify-between items-center">
                          <div>
                            <p className={cn('font-semibold', tierColors[up.plans?.tier || 'free'])}>{up.plans?.name}</p>
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                              <Calendar className="w-3 h-3" />{up.expires_at ? `Expires ${new Date(up.expires_at).toLocaleDateString()}` : 'Lifetime'}
                            </div>
                          </div>
                          <Badge className="bg-green-900/50 text-green-400 border-green-800 text-xs">Active</Badge>
                        </div>
                      ))}
                      <a href="/billing" className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 mt-2 px-1"><Key className="w-3 h-3" />Manage Plans</a>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-slate-400 mb-4 text-sm">No active plan. Upgrade to unlock features.</p>
                      <a href="/billing" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-bold hover:from-cyan-700 hover:to-blue-700 transition-all"><Key className="w-4 h-4" />View Plans</a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          {/* TOOLS */}
          <TabsContent value="tools">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-1">StreamVibe Tools</h2>
              <p className="text-slate-400 mb-6">Live stream tools to grow your TikTok audience.</p>
              {tierRank[highestTier] >= tierRank['basic'] ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <a href="/tools/auction" className="group bg-[#12121e] border border-slate-800 rounded-xl p-5 hover:border-cyan-700 transition-all flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-cyan-400" />
                      </div>
                      <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-bold">NEW</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                        Live Auction <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-cyan-500" />
                      </h3>
                      <p className="text-slate-400 text-sm">Run live gift auctions on TikTok. Auto-detects leaders, snipe protection, real-time bids, and stream overlay.</p>
                    </div>
                  </a>
                  <a href="/tools/overlay-setup" className="group bg-[#12121e] border border-slate-800 rounded-xl p-5 hover:border-purple-700 transition-all flex flex-col gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Layers className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                        Overlay Setup <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-purple-500" />
                      </h3>
                      <p className="text-slate-400 text-sm">Customise theme, opacity and get your 1920x1080 browser source URL for TikTok Live Studio.</p>
                    </div>
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-800 rounded-2xl bg-[#0d0d1a]">
                  <div className="text-5xl mb-4">🔒</div>
                  <h3 className="text-xl font-black text-white mb-2">Access Denied</h3>
                  <p className="text-slate-400 mb-1">StreamVibe Tools require a <span className="text-cyan-400 font-semibold">Basic plan</span> or higher.</p>
                  <p className="text-slate-600 text-sm mb-6">Upgrade to unlock Live Auction, Stream Overlay, and more.</p>
                  <a href="/billing" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold rounded-xl hover:from-cyan-400 hover:to-blue-400 transition-all">
                    View Plans & Upgrade
                  </a>
                </div>
              )}
            </div>
          </TabsContent>

          {/* DOWNLOADS */}
          <TabsContent value="downloads">
            <Card className="bg-[#12121e] border-slate-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-cyan-400" />Available Downloads</CardTitle>
                <CardDescription className="text-slate-400">Your plan unlocks the following software</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDownloads ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /></div>
                : downloads.length === 0 ? <p className="text-center text-slate-500 py-8">No downloads available yet.</p>
                : (
                  <div className="space-y-3">
                    {downloads.map((dl) => {
                      const unlocked = tierRank[highestTier] >= tierRank[dl.tier]
                      const DlIcon = tierIcons[dl.tier] || Gift
                      const canDownload = !!(dl.file_url || dl.github_repo)
                      return (
                        <div key={dl.id} className={cn('flex items-center justify-between p-4 rounded-xl border transition-all',
                          unlocked ? 'bg-[#0d0d1a] border-slate-700' : 'bg-[#0a0a12] border-slate-800 opacity-60')}>
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn('p-2 rounded-lg shrink-0', unlocked ? 'bg-cyan-950/50' : 'bg-slate-800')}>
                              <DlIcon className={cn('w-5 h-5', unlocked ? tierColors[dl.tier] : 'text-slate-600')} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm">{dl.name} <span className="text-xs text-slate-500">{dl.version}</span></p>
                              {dl.description && <p className="text-xs text-slate-500 truncate">{dl.description}</p>}
                              {dl.last_updated && <p className="text-xs text-slate-600 mt-0.5">Updated {new Date(dl.last_updated).toLocaleDateString()}</p>}
                            </div>
                          </div>
                          {unlocked ? (
                            canDownload ? (
                              <button onClick={() => handleDownload(dl)} disabled={downloading === dl.id} className="shrink-0 ml-3 text-xs px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-bold hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{downloading === dl.id ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Downloading...</span> : 'Download'}</button>
                            ) : (
                              <span className="shrink-0 ml-3 text-xs px-3 py-1.5 bg-slate-800 text-slate-500 rounded-lg">Coming Soon</span>
                            )
                          ) : (
                            <a href="/billing" className={cn('shrink-0 ml-3 text-xs px-3 py-1.5 rounded-lg font-bold border', tierColors[dl.tier], 'border-current/30 hover:opacity-80')}>
                              Requires {dl.tier.charAt(0).toUpperCase() + dl.tier.slice(1)}
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DEVICES */}
          <TabsContent value="devices">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Monitor className="w-5 h-5 text-cyan-400" />My Devices</CardTitle>
                <CardDescription className="text-slate-500">Manage HWID device locks on your license keys.</CardDescription>
              </CardHeader>
              <CardContent>
                {userKeys.length === 0 && !loadingKeys ? (
                  <div className="text-center py-12">
                    <Monitor className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                    <p className="text-slate-500 mb-4">No keys found on your account.</p>
                    <button onClick={loadUserKeys} className="text-sm text-cyan-400 hover:underline">Load my keys</button>
                  </div>
                ) : loadingKeys ? <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
                : (
                  <div className="space-y-4">
                    {userKeys.map(k => {
                      const pct = Math.round(((k.hwid_device_count || 0) / (k.max_devices || 5)) * 100)
                      const atLimit = (k.hwid_device_count || 0) >= (k.max_devices || 5)
                      return (
                        <div key={k.id} className="bg-[#0d0d1a] rounded-xl border border-slate-800 p-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {revealedKeys.has(k.id) ? (
                                <>
                                  <span className="font-mono text-sm text-white tracking-wider truncate">{k.key_code}</span>
                                  <button
                                    onClick={async () => { await navigator.clipboard.writeText(k.key_code); setCopiedKey(k.id); setTimeout(() => setCopiedKey(null), 2000) }}
                                    className="shrink-0 text-slate-400 hover:text-green-400 transition-colors p-1 rounded"
                                    title="Copy key"
                                  >
                                    {copiedKey === k.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => setRevealedKeys(prev => { const s = new Set(prev); s.delete(k.id); return s })}
                                    className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded"
                                    title="Hide"
                                  >
                                    <EyeOff className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setRevealedKeys(prev => { const s = new Set(prev); s.add(k.id); return s })}
                                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors border border-dashed border-slate-700 hover:border-cyan-700 rounded-lg px-3 py-1.5"
                                >
                                  <Eye className="w-3 h-3" />Click to reveal
                                </button>
                              )}
                            </div>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', k.status === 'active' ? 'bg-green-900/40 text-green-400' : 'bg-slate-800 text-slate-400')}>{k.status}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3 text-xs text-slate-400">
                            {k.plans && (
                              <span className="flex items-center gap-1">
                                <Key className="w-3 h-3" />
                                <span className="text-slate-500">Plan:</span>
                                <span className={cn("font-semibold", tierColors[k.plans.tier] || "text-slate-300")}>{k.plans.name}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span className="text-slate-500">Expires:</span>
                              <span className={cn("font-semibold", k.expires_at && new Date(k.expires_at) < new Date() ? "text-red-400" : "text-slate-300")}>
                                {k.expires_at ? new Date(k.expires_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Never"}
                              </span>
                            </span>
                            {k.redeemed_at && (
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                <span className="text-slate-500">Activated:</span>
                                <span className="text-slate-300">{new Date(k.redeemed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                              </span>
                            )}
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
                          {k.hwid_locked && <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-900/20 border border-orange-900/40 rounded-lg px-3 py-2 mb-3"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />Device limit reached. Reset to use on a new device.</div>}
                          <button onClick={() => resetMyHwid(k.key_code)} disabled={resettingHwid === k.key_code} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-cyan-700 transition-all disabled:opacity-50">
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

          {/* BILLING HISTORY */}
          <TabsContent value="billing">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-400" />Billing History</CardTitle>
                  <CardDescription className="text-slate-500">Your payment transactions</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={loadBillingHistory} disabled={loadingBilling} className="border-slate-700 text-slate-400 hover:text-white">
                  {loadingBilling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
                </Button>
              </CardHeader>
              <CardContent>
                {loadingBilling ? <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>
                : billingHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                    <p className="text-slate-500">No transactions found.</p>
                    <a href="/billing" className="mt-3 inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300">View plans →</a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {billingHistory.map(o => (
                      <div key={o.id} className="flex items-center justify-between bg-[#0d0d1a] rounded-lg px-4 py-3 border border-slate-800">
                        <div>
                          <p className="text-white text-sm font-medium">{(o.plans as any)?.name || 'Plan Purchase'}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{o.order_id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-bold">${o.amount?.toFixed(2)}</p>
                          <div className="flex items-center gap-2 justify-end mt-0.5">
                            <Badge className={o.status === 'completed' ? 'bg-green-900/50 text-green-400 border-green-800 text-xs py-0' : 'bg-slate-800 text-slate-400 text-xs py-0'}>{o.status}</Badge>
                            <span className="text-xs text-slate-600">{new Date(o.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Picture */}
              <Card className="bg-[#12121e] border-slate-800 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Camera className="w-5 h-5 text-cyan-400" />Profile Picture</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 ring-2 ring-slate-700">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-cyan-900 text-cyan-300 text-2xl font-bold">{(user.user_metadata?.username || user.email || 'U')[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-slate-300 mb-1">Upload a new photo</p>
                      <p className="text-xs text-slate-500">JPG, PNG, WebP or GIF. Max 5MB.</p>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="w-full bg-cyan-900/50 hover:bg-cyan-800/60 border border-cyan-800 text-cyan-300">
                    {uploadingAvatar ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading...</> : <><Camera className="w-4 h-4 mr-2" />Choose Photo</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card className="bg-[#12121e] border-slate-800 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-cyan-400" />Change Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">New Password</label>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" className="bg-[#060610] border-slate-700 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Confirm Password</label>
                    <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" className="bg-[#060610] border-slate-700 text-white" />
                  </div>
                  <Button onClick={changePassword} disabled={savingPassword || !newPassword} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                    {savingPassword ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : 'Update Password'}
                  </Button>
                </CardContent>
              </Card>

              {/* Account Info */}
              <Card className="bg-[#12121e] border-slate-800 text-white md:col-span-2">
                <CardHeader><CardTitle className="text-slate-400 text-sm uppercase tracking-wider font-bold">Account Info</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-[#0d0d1a] rounded-xl"><p className="text-xs text-slate-500 mb-1">Email</p><p className="text-white font-medium">{user.email}</p></div>
                  <div className="p-4 bg-[#0d0d1a] rounded-xl"><p className="text-xs text-slate-500 mb-1">Username</p><p className="text-white font-medium">{user.user_metadata?.username || <span className="text-slate-500 italic">Not set</span>}</p></div>
                  <div className="p-4 bg-[#0d0d1a] rounded-xl"><p className="text-xs text-slate-500 mb-1">User ID</p><p className="font-mono text-xs text-slate-400 break-all">{user.id}</p></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}
