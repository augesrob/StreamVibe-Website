"use client"
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Shield, Users, Key, Loader2, RefreshCw, Copy, CheckCircle, XCircle, Clock,
  CreditCard, Search, Edit2, Ban, RotateCcw, Trash2, Monitor, Mail, ChevronDown, ChevronUp, X, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile {
  id: string; username: string | null; avatar_url: string | null
  discord_user_id: string | null; is_banned: boolean; created_at: string
}
interface UserDetail extends Profile {
  plans: { id: string; plan_id: string; expires_at: string | null; plans: { name: string; tier: string } | null }[]
  keys: LicenseKey[]
  paypal: PayPalOrder[]
}
interface LicenseKey {
  id: string; key_code: string; status: 'inactive' | 'active' | 'expired' | 'banned'
  user_id: string | null; plan_id: string | null; expires_at: string | null
  hwid: string | null; hwid_device_count: number; hwid_locked: boolean; max_devices: number
  ip_address: string | null; created_at: string; redeemed_at: string | null; notes: string | null
}
interface Plan { id: string; name: string; tier: string; billing_interval: string; price: number }
interface PayPalOrder {
  id: string; order_id: string; plan_id: string | null; amount: number; status: string
  payer_email: string | null; payer_name: string | null; created_at: string; captured_at: string | null
  plans?: { name: string } | null
}
interface Stats { users: number; activeKeys: number; totalKeys: number; activePlans: number; revenue: number }

const KEY_STATUS_META = {
  inactive: { label: 'Inactive', color: 'text-slate-400', bg: 'bg-slate-800', icon: Clock },
  active:   { label: 'Active',   color: 'text-green-400', bg: 'bg-green-900/40', icon: CheckCircle },
  expired:  { label: 'Expired',  color: 'text-orange-400', bg: 'bg-orange-900/30', icon: XCircle },
  banned:   { label: 'Banned',   color: 'text-red-400',   bg: 'bg-red-900/30', icon: XCircle },
}
const TIER_COLORS: Record<string, string> = {
  free: 'text-slate-400 bg-slate-800', basic: 'text-blue-300 bg-blue-900/40',
  pro: 'text-purple-300 bg-purple-900/40', legend: 'text-yellow-300 bg-yellow-900/40',
}

function generateKeyCode() {
  return 'SV-' + Array.from({ length: 4 }, () => Math.random().toString(36).toUpperCase().substring(2, 6)).join('-')
}

// ── User Edit Modal ──────────────────────────────────────────────────────────
function UserEditModal({ user, plans, onClose, onSaved, toast }: {
  user: UserDetail; plans: Plan[]
  onClose: () => void; onSaved: () => void
  toast: (t: any) => void
}) {
  const [username, setUsername] = useState(user.username || '')
  const [discordId, setDiscordId] = useState(user.discord_user_id || '')
  const [isBanned, setIsBanned] = useState(user.is_banned)
  const [saving, setSaving] = useState(false)
  const [resettingPw, setResettingPw] = useState(false)
  const [grantPlanId, setGrantPlanId] = useState('')
  const [granting, setGranting] = useState(false)
  const [revokingPlanId, setRevokingPlanId] = useState<string | null>(null)
  const [removingKeyId, setRemovingKeyId] = useState<string | null>(null)
  const [resettingHwidId, setResettingHwidId] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ username, discord_user_id: discordId || null, is_banned: isBanned }).eq('id', user.id)
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message })
    else { toast({ title: 'User saved' }); onSaved() }
    setSaving(false)
  }

  const sendPasswordReset = async () => {
    setResettingPw(true)
    const res = await fetch('/api/admin/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id }) })
    const d = await res.json()
    if (d.success) toast({ title: 'Password reset email sent' })
    else toast({ variant: 'destructive', title: 'Error', description: d.error })
    setResettingPw(false)
  }

  const grantPlan = async () => {
    if (!grantPlanId) return
    setGranting(true)
    const res = await fetch('/api/admin/user-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, plan_id: grantPlanId }) })
    const d = await res.json()
    if (d.success) { toast({ title: 'Plan granted' }); onSaved(); setGrantPlanId('') }
    else toast({ variant: 'destructive', title: 'Error', description: d.error })
    setGranting(false)
  }

  const revokePlan = async (planRowId: string) => {
    setRevokingPlanId(planRowId)
    const { error } = await supabase.from('user_plans').delete().eq('id', planRowId)
    if (!error) { toast({ title: 'Plan revoked' }); onSaved() }
    else toast({ variant: 'destructive', title: 'Error', description: error.message })
    setRevokingPlanId(null)
  }

  const removeKeyFromUser = async (keyId: string) => {
    setRemovingKeyId(keyId)
    const { error } = await supabase.from('license_keys').update({ user_id: null, status: 'inactive', hwid: null, hwid_device_count: 0, hwid_locked: false }).eq('id', keyId)
    if (!error) { toast({ title: 'Key unlinked from user' }); onSaved() }
    else toast({ variant: 'destructive', title: 'Error', description: error.message })
    setRemovingKeyId(null)
  }

  const resetHwid = async (keyId: string) => {
    setResettingHwidId(keyId)
    const res = await fetch('/api/v1/keys/reset-hwid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key_code: user.keys.find(k => k.id === keyId)?.key_code }) })
    const d = await res.json()
    if (d.success) { toast({ title: 'HWID reset — all devices cleared' }); onSaved() }
    else toast({ variant: 'destructive', title: 'Error', description: d.error })
    setResettingHwidId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 overflow-y-auto pt-8 pb-8 px-4">
      <div className="bg-[#0d0d1a] border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">Edit User</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{user.id}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          {/* Profile */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Username</label>
                <Input value={username} onChange={e => setUsername(e.target.value)} className="bg-[#060610] border-slate-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Discord User ID</label>
                <Input value={discordId} onChange={e => setDiscordId(e.target.value)} placeholder="123456789012345678" className="bg-[#060610] border-slate-700 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isBanned} onChange={e => setIsBanned(e.target.checked)} className="w-4 h-4 accent-red-500" />
                <span className="text-sm text-slate-300">Banned</span>
              </label>
              {isBanned && <Badge className="bg-red-900/50 text-red-400 border-red-800">User is banned</Badge>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={save} disabled={saving} className="bg-cyan-700 hover:bg-cyan-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Changes
              </Button>
              <Button onClick={sendPasswordReset} disabled={resettingPw} variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
                {resettingPw ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}Send Password Reset
              </Button>
            </div>
          </section>

          {/* Active Plans */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Plans</h3>
            {user.plans.length === 0 ? <p className="text-xs text-slate-600">No active plans.</p> : (
              <div className="space-y-2">
                {user.plans.map(up => (
                  <div key={up.id} className="flex items-center justify-between bg-[#060610] rounded-lg px-3 py-2 border border-slate-800">
                    <div>
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium capitalize mr-2', TIER_COLORS[(up.plans as any)?.tier || 'free'])}>{(up.plans as any)?.tier}</span>
                      <span className="text-sm text-white">{(up.plans as any)?.name}</span>
                      {up.expires_at && <span className="text-xs text-slate-500 ml-2">Expires {new Date(up.expires_at).toLocaleDateString()}</span>}
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-400 h-7 px-2"
                      disabled={revokingPlanId === up.id} onClick={() => revokePlan(up.id)}>
                      {revokingPlanId === up.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <select value={grantPlanId} onChange={e => setGrantPlanId(e.target.value)} className="flex-1 h-9 px-3 rounded-md border border-slate-700 bg-[#060610] text-white text-sm">
                <option value="">Grant a plan...</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price})</option>)}
              </select>
              <Button onClick={grantPlan} disabled={granting || !grantPlanId} className="bg-green-800 hover:bg-green-700 text-white whitespace-nowrap">
                {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Grant Plan'}
              </Button>
            </div>
          </section>

          {/* License Keys */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">License Keys</h3>
            {user.keys.length === 0 ? <p className="text-xs text-slate-600">No keys linked to this user.</p> : (
              <div className="space-y-2">
                {user.keys.map(k => {
                  const sm = KEY_STATUS_META[k.status]
                  return (
                    <div key={k.id} className="bg-[#060610] rounded-lg p-3 border border-slate-800">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono text-xs text-white tracking-wider">{k.key_code}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', sm.bg, sm.color)}>{sm.label}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><Monitor className="w-3 h-3" />{k.hwid_device_count}/{k.max_devices} devices{k.hwid_locked && <Badge className="ml-1 text-xs bg-orange-900/50 text-orange-400 border-orange-800 py-0 px-1.5">Locked</Badge>}</span>
                        {k.expires_at && <span>Exp: {new Date(k.expires_at).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs border-slate-700 text-slate-400 hover:text-white"
                          disabled={resettingHwidId === k.id} onClick={() => resetHwid(k.id)}>
                          {resettingHwidId === k.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}Reset HWID
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-red-900 text-red-400 hover:bg-red-950"
                          disabled={removingKeyId === k.id} onClick={() => removeKeyFromUser(k.id)}>
                          {removingKeyId === k.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <X className="w-3 h-3 mr-1" />}Remove from Account
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* PayPal History */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">PayPal History</h3>
            {user.paypal.length === 0 ? <p className="text-xs text-slate-600">No PayPal orders found.</p> : (
              <div className="space-y-2">
                {user.paypal.map(o => (
                  <div key={o.id} className="flex items-center justify-between bg-[#060610] rounded-lg px-3 py-2 border border-slate-800 text-xs">
                    <div>
                      <span className="text-white font-medium">{(o.plans as any)?.name || 'Unknown Plan'}</span>
                      <span className="text-slate-500 ml-2">{o.payer_email}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-green-400 font-bold">${o.amount?.toFixed(2)}</span>
                      <span className="text-slate-600 ml-2">{new Date(o.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState<Stats>({ users: 0, activeKeys: 0, totalKeys: 0, activePlans: 0, revenue: 0 })
  const [users, setUsers] = useState<Profile[]>([])
  const [keys, setKeys] = useState<LicenseKey[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [paypalOrders, setPaypalOrders] = useState<PayPalOrder[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [loadingPaypal, setLoadingPaypal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genCount, setGenCount] = useState(1)
  const [genPlanId, setGenPlanId] = useState('')
  const [keySearch, setKeySearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [editingUser, setEditingUser] = useState<UserDetail | null>(null)
  const [loadingUserDetail, setLoadingUserDetail] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [resettingHwid, setResettingHwid] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.push('/dashboard')
  }, [loading, user, isAdmin, router])

  const loadStats = useCallback(async () => {
    const [{ count: userCount }, { count: keyCount }, { count: activeKeyCount }, { count: planCount }, { data: revenueData }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('license_keys').select('*', { count: 'exact', head: true }),
      supabase.from('license_keys').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('user_plans').select('*', { count: 'exact', head: true }),
      supabase.from('paypal_orders').select('amount').eq('status', 'completed'),
    ])
    const revenue = (revenueData || []).reduce((sum: number, o: any) => sum + (o.amount || 0), 0)
    setStats({ users: userCount || 0, totalKeys: keyCount || 0, activeKeys: activeKeyCount || 0, activePlans: planCount || 0, revenue })
  }, [])

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    const { data } = await supabase.from('profiles').select('id, username, avatar_url, discord_user_id, is_banned, created_at').order('created_at', { ascending: false }).limit(200)
    setUsers(data || [])
    setLoadingUsers(false)
  }, [])

  const loadKeys = useCallback(async () => {
    setLoadingKeys(true)
    const { data } = await supabase.from('license_keys').select('*').order('created_at', { ascending: false }).limit(200)
    setKeys(data || [])
    setLoadingKeys(false)
  }, [])

  const loadPlans = useCallback(async () => {
    const { data } = await supabase.from('plans').select('id, name, tier, billing_interval, price').order('sort_order')
    setPlans(data || [])
  }, [])

  const loadPaypal = useCallback(async () => {
    setLoadingPaypal(true)
    const { data } = await supabase.from('paypal_orders').select('*, plans(name)').order('created_at', { ascending: false }).limit(200)
    setPaypalOrders(data || [])
    setLoadingPaypal(false)
  }, [])

  useEffect(() => {
    if (isAdmin) { loadStats(); loadPlans() }
  }, [isAdmin, loadStats, loadPlans])

  const openUserEdit = async (userId: string) => {
    setLoadingUserDetail(userId)
    const [{ data: profile }, { data: userPlans }, { data: userKeys }, { data: userPaypal }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_plans').select('id, plan_id, expires_at, plans(name, tier)').eq('user_id', userId),
      supabase.from('license_keys').select('*').eq('user_id', userId),
      supabase.from('paypal_orders').select('*, plans(name)').eq('user_id', userId).order('created_at', { ascending: false }),
    ])
    if (profile) {
      setEditingUser({ ...profile, plans: userPlans || [], keys: userKeys || [], paypal: userPaypal || [] })
    }
    setLoadingUserDetail(null)
  }

  const generateKeys = async () => {
    setGenerating(true)
    const newKeys = Array.from({ length: Math.min(genCount, 50) }, () => ({ key_code: generateKeyCode(), status: 'inactive' as const, plan_id: genPlanId || null }))
    const { error } = await supabase.from('license_keys').insert(newKeys)
    if (!error) { toast({ title: `${newKeys.length} key(s) generated` }); loadStats(); if (keys.length > 0) loadKeys() }
    else toast({ variant: 'destructive', title: 'Error', description: error.message })
    setGenerating(false)
  }

  const updateKeyStatus = async (id: string, status: LicenseKey['status']) => {
    const { error } = await supabase.from('license_keys').update({ status }).eq('id', id)
    if (!error) { setKeys(prev => prev.map(k => k.id === id ? { ...k, status } : k)); toast({ title: 'Status updated' }) }
  }

  const resetKeyHwid = async (keyCode: string) => {
    setResettingHwid(keyCode)
    const res = await fetch('/api/v1/keys/reset-hwid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key_code: keyCode }) })
    const d = await res.json()
    if (d.success) { toast({ title: 'HWID reset' }); loadKeys() }
    else toast({ variant: 'destructive', title: 'Error', description: d.error })
    setResettingHwid(null)
  }

  const filteredKeys = keys.filter(k => !keySearch || k.key_code.toLowerCase().includes(keySearch.toLowerCase()) || k.status.includes(keySearch.toLowerCase()))
  const filteredUsers = users.filter(u => !userSearch || (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) || u.id.includes(userSearch))

  if (loading || !isAdmin) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen pt-24 px-4 bg-[#08080f] text-white pb-20">
      {editingUser && <UserEditModal user={editingUser} plans={plans} onClose={() => setEditingUser(null)}
        onSaved={() => { loadUsers(); loadStats(); setEditingUser(null) }} toast={toast} />}

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-cyan-950/50 rounded-lg border border-cyan-900/50"><Shield className="w-6 h-6 text-cyan-400" /></div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-500 text-sm">StreamVibe management console</p>
          </div>
          <Badge className="ml-2 bg-cyan-900/50 text-cyan-400 border-cyan-800">Admin</Badge>
          <a href="/api-docs" className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors">
            <BookOpen className="w-4 h-4" />API Docs
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Users', value: stats.users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-950/30 border-blue-900/50' },
            { label: 'Active Keys', value: stats.activeKeys, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-950/30 border-green-900/50' },
            { label: 'Total Keys', value: stats.totalKeys, icon: Key, color: 'text-purple-400', bg: 'bg-purple-950/30 border-purple-900/50' },
            { label: 'Active Plans', value: stats.activePlans, icon: CreditCard, color: 'text-cyan-400', bg: 'bg-cyan-950/30 border-cyan-900/50' },
            { label: 'Revenue', value: `$${stats.revenue.toFixed(2)}`, icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-900/50' },
          ].map((s, i) => (
            <Card key={i} className={cn('border', s.bg)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                  <p className={cn('text-2xl font-extrabold', s.color)}>{s.value}</p>
                </div>
                <s.icon className={cn('w-8 h-8 opacity-30', s.color)} />
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="bg-[#12121e] border border-slate-800 p-1 mb-6 h-auto gap-1 flex-wrap">
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-900/50 data-[state=active]:text-blue-300" onClick={() => { if (users.length === 0) loadUsers() }}>
              <Users className="w-4 h-4 mr-2" />Users
            </TabsTrigger>
            <TabsTrigger value="keys" className="data-[state=active]:bg-purple-900/50 data-[state=active]:text-purple-300">
              <Key className="w-4 h-4 mr-2" />License Keys
            </TabsTrigger>
            <TabsTrigger value="paypal" className="data-[state=active]:bg-emerald-900/50 data-[state=active]:text-emerald-300" onClick={() => { if (paypalOrders.length === 0) loadPaypal() }}>
              <CreditCard className="w-4 h-4 mr-2" />PayPal History
            </TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-white">Users</CardTitle>
                  <CardDescription className="text-slate-500">{stats.users} registered accounts</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 bg-[#0d0d1a] border-slate-700 text-white w-48" />
                  </div>
                  <Button size="sm" variant="outline" onClick={loadUsers} disabled={loadingUsers} className="border-slate-700 text-slate-400 hover:text-white">
                    {loadingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-blue-400 animate-spin" /></div>
                : users.length === 0 ? <p className="text-center text-slate-500 py-12">Click Refresh to load users.</p>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-xs">
                          <th className="text-left pb-3 font-medium">User</th>
                          <th className="text-left pb-3 font-medium hidden md:table-cell">Joined</th>
                          <th className="text-left pb-3 font-medium hidden lg:table-cell">Discord</th>
                          <th className="text-left pb-3 font-medium">Status</th>
                          <th className="text-right pb-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-slate-800/20">
                            <td className="py-3 pr-4">
                              <div>
                                <span className="text-white font-medium">{u.username || <span className="text-slate-500 italic text-xs">unnamed</span>}</span>
                                <p className="font-mono text-xs text-slate-600">{u.id.slice(0, 14)}…</p>
                              </div>
                            </td>
                            <td className="py-3 pr-4 hidden md:table-cell text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="py-3 pr-4 hidden lg:table-cell text-slate-500 text-xs font-mono">{u.discord_user_id || '—'}</td>
                            <td className="py-3 pr-4">
                              {u.is_banned
                                ? <Badge className="bg-red-900/50 text-red-400 border-red-800 text-xs">Banned</Badge>
                                : <Badge className="bg-green-900/50 text-green-400 border-green-800 text-xs">Active</Badge>}
                            </td>
                            <td className="py-3 text-right">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400 hover:text-white"
                                disabled={loadingUserDetail === u.id} onClick={() => openUserEdit(u.id)}>
                                {loadingUserDetail === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Edit2 className="w-3 h-3 mr-1" />}
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-slate-600 mt-4 text-right">Showing {filteredUsers.length} of {users.length}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* KEYS TAB */}
          <TabsContent value="keys" className="space-y-6">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Key className="w-5 h-5 text-purple-400" />Generate Keys</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Quantity (max 50)</label>
                    <Input type="number" min={1} max={50} value={genCount} onChange={e => setGenCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))} className="w-24 bg-[#0d0d1a] border-slate-700 text-white" />
                  </div>
                  <div className="flex-1 min-w-48">
                    <label className="text-xs text-slate-400 mb-1 block">Assign to Plan (optional)</label>
                    <select value={genPlanId} onChange={e => setGenPlanId(e.target.value)} className="w-full h-10 px-3 rounded-md border border-slate-700 bg-[#0d0d1a] text-white text-sm">
                      <option value="">— No specific plan —</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>)}
                    </select>
                  </div>
                  <Button onClick={generateKeys} disabled={generating} className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold min-w-36">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}Generate {genCount > 1 ? `${genCount} Keys` : 'Key'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-white text-lg">All License Keys</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input placeholder="Search..." value={keySearch} onChange={e => setKeySearch(e.target.value)} className="pl-9 bg-[#0d0d1a] border-slate-700 text-white w-48" />
                  </div>
                  <Button size="sm" variant="outline" onClick={loadKeys} disabled={loadingKeys} className="border-slate-700 text-slate-400 hover:text-white">
                    {loadingKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {keys.length === 0 && !loadingKeys ? (
                  <div className="text-center py-12">
                    <Key className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                    <p className="text-slate-500">No keys loaded.</p>
                    <Button variant="outline" className="mt-4 border-slate-700 text-slate-400" onClick={loadKeys}>Load Keys</Button>
                  </div>
                ) : loadingKeys ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
                : (
                  <div className="space-y-2">
                    {filteredKeys.map(k => {
                      const sm = KEY_STATUS_META[k.status]
                      const isExpanded = expandedKey === k.id
                      return (
                        <div key={k.id} className="border border-slate-800 rounded-lg overflow-hidden">
                          <div className="flex items-center gap-3 px-4 py-3 bg-[#0d0d1a] hover:bg-[#10101c] cursor-pointer" onClick={() => setExpandedKey(isExpanded ? null : k.id)}>
                            <span className="font-mono text-xs text-white tracking-wider flex-1">{k.key_code}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline', sm.bg, sm.color)}>{sm.label}</span>
                            <span className="text-xs text-slate-600 hidden md:inline flex items-center gap-1"><Monitor className="w-3 h-3 inline mr-1" />{k.hwid_device_count || 0}/{k.max_devices || 5}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                          </div>
                          {isExpanded && (
                            <div className="px-4 py-3 bg-[#08080f] border-t border-slate-800 space-y-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div><span className="text-slate-500">HWID Devices</span><p className="text-white font-medium">{k.hwid_device_count || 0} / {k.max_devices || 5}{k.hwid_locked && <span className="text-orange-400 ml-1">(Locked)</span>}</p></div>
                                <div><span className="text-slate-500">IP Address</span><p className="text-white font-mono">{k.ip_address || '—'}</p></div>
                                <div><span className="text-slate-500">Expires</span><p className="text-white">{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Never'}</p></div>
                                <div><span className="text-slate-500">Redeemed</span><p className="text-white">{k.redeemed_at ? new Date(k.redeemed_at).toLocaleDateString() : '—'}</p></div>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white border border-slate-700" onClick={() => { navigator.clipboard.writeText(k.key_code); toast({ title: 'Copied' }) }}><Copy className="w-3 h-3 mr-1" />Copy</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-orange-400 hover:text-orange-300 border border-orange-900" disabled={resettingHwid === k.key_code} onClick={() => resetKeyHwid(k.key_code)}>
                                  {resettingHwid === k.key_code ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}Reset HWID
                                </Button>
                                {k.status !== 'banned' && <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300 border border-red-900" onClick={() => updateKeyStatus(k.id, 'banned')}><Ban className="w-3 h-3 mr-1" />Ban</Button>}
                                {k.status === 'banned' && <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400 hover:text-green-300 border border-green-900" onClick={() => updateKeyStatus(k.id, 'inactive')}><CheckCircle className="w-3 h-3 mr-1" />Unban</Button>}
                                {k.status === 'inactive' && <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400 hover:text-green-300 border border-green-900" onClick={() => updateKeyStatus(k.id, 'active')}><CheckCircle className="w-3 h-3 mr-1" />Activate</Button>}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <p className="text-xs text-slate-600 text-right pt-2">Showing {filteredKeys.length} of {keys.length} keys</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PAYPAL TAB */}
          <TabsContent value="paypal">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">PayPal Transaction History</CardTitle>
                  <CardDescription className="text-slate-500">Total revenue: <span className="text-emerald-400 font-bold">${stats.revenue.toFixed(2)}</span></CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={loadPaypal} disabled={loadingPaypal} className="border-slate-700 text-slate-400 hover:text-white">
                  {loadingPaypal ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {loadingPaypal ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>
                : paypalOrders.length === 0 ? <p className="text-center text-slate-500 py-12">No PayPal orders yet.</p>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-xs">
                          <th className="text-left pb-3 font-medium">Order ID</th>
                          <th className="text-left pb-3 font-medium">Plan</th>
                          <th className="text-left pb-3 font-medium hidden md:table-cell">Payer</th>
                          <th className="text-left pb-3 font-medium">Amount</th>
                          <th className="text-left pb-3 font-medium">Status</th>
                          <th className="text-left pb-3 font-medium hidden lg:table-cell">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {paypalOrders.map(o => (
                          <tr key={o.id} className="hover:bg-slate-800/20">
                            <td className="py-3 pr-4 font-mono text-xs text-slate-400">{o.order_id.slice(0, 14)}…</td>
                            <td className="py-3 pr-4 text-white text-xs">{(o.plans as any)?.name || '—'}</td>
                            <td className="py-3 pr-4 hidden md:table-cell">
                              <div className="text-xs"><p className="text-white">{o.payer_name || '—'}</p><p className="text-slate-500">{o.payer_email || ''}</p></div>
                            </td>
                            <td className="py-3 pr-4 text-emerald-400 font-bold">${o.amount?.toFixed(2)}</td>
                            <td className="py-3 pr-4">
                              <Badge className={o.status === 'completed' ? 'bg-green-900/50 text-green-400 border-green-800 text-xs' : 'bg-slate-800 text-slate-400 text-xs'}>{o.status}</Badge>
                            </td>
                            <td className="py-3 hidden lg:table-cell text-slate-400 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
