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
import { Shield, Users, Key, Loader2, RefreshCw, Copy, Trash2, CheckCircle, XCircle, Clock, CreditCard, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile { id: string; username: string | null; created_at: string }
interface LicenseKey {
  id: string; key_code: string; status: 'inactive' | 'active' | 'expired' | 'banned'
  user_id: string | null; plan_id: string | null; expires_at: string | null
  hwid: string | null; ip_address: string | null; created_at: string; redeemed_at: string | null
}
interface Plan { id: string; name: string; tier: string; billing_interval: string; price: number }
interface Stats { users: number; activeKeys: number; totalKeys: number; activePlans: number }

const KEY_STATUS_META = {
  inactive: { label: 'Inactive', color: 'text-slate-400', bg: 'bg-slate-800', icon: Clock },
  active:   { label: 'Active',   color: 'text-green-400', bg: 'bg-green-900/40', icon: CheckCircle },
  expired:  { label: 'Expired',  color: 'text-orange-400', bg: 'bg-orange-900/30', icon: XCircle },
  banned:   { label: 'Banned',   color: 'text-red-400',  bg: 'bg-red-900/30', icon: XCircle },
}

function generateKeyCode() {
  return 'SV-' + Array.from({ length: 4 }, () =>
    Math.random().toString(36).toUpperCase().substring(2, 6)
  ).join('-')
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState<Stats>({ users: 0, activeKeys: 0, totalKeys: 0, activePlans: 0 })
  const [users, setUsers] = useState<Profile[]>([])
  const [keys, setKeys] = useState<LicenseKey[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genCount, setGenCount] = useState(1)
  const [genPlanId, setGenPlanId] = useState('')
  const [keySearch, setKeySearch] = useState('')

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.push('/dashboard')
  }, [loading, user, isAdmin, router])

  const loadStats = useCallback(async () => {
    const [{ count: userCount }, { count: keyCount }, { count: activeKeyCount }, { count: planCount }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('license_keys').select('*', { count: 'exact', head: true }),
      supabase.from('license_keys').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('user_plans').select('*', { count: 'exact', head: true }),
    ])
    setStats({ users: userCount || 0, totalKeys: keyCount || 0, activeKeys: activeKeyCount || 0, activePlans: planCount || 0 })
  }, [])

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    const { data } = await supabase.from('profiles').select('id, username, created_at').order('created_at', { ascending: false }).limit(100)
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

  useEffect(() => {
    if (isAdmin) { loadStats(); loadPlans() }
  }, [isAdmin, loadStats, loadPlans])

  const generateKeys = async () => {
    setGenerating(true)
    const newKeys = Array.from({ length: Math.min(genCount, 50) }, () => ({
      key_code: generateKeyCode(),
      status: 'inactive' as const,
      plan_id: genPlanId || null,
    }))
    const { error } = await supabase.from('license_keys').insert(newKeys)
    if (!error) {
      toast({ title: `${newKeys.length} key(s) generated`, description: newKeys.map(k => k.key_code).join(', ') })
      loadStats()
      if (keys.length > 0) loadKeys()
    } else {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    }
    setGenerating(false)
  }

  const copyKey = (keyCode: string) => {
    navigator.clipboard.writeText(keyCode)
    toast({ title: 'Copied!', description: keyCode })
  }

  const updateKeyStatus = async (id: string, status: LicenseKey['status']) => {
    const { error } = await supabase.from('license_keys').update({ status }).eq('id', id)
    if (!error) {
      setKeys(prev => prev.map(k => k.id === id ? { ...k, status } : k))
      toast({ title: 'Status updated' })
    }
  }

  const filteredKeys = keys.filter(k =>
    !keySearch || k.key_code.toLowerCase().includes(keySearch.toLowerCase()) || k.status.includes(keySearch.toLowerCase())
  )

  if (loading || !isAdmin) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen pt-24 px-4 bg-[#08080f] text-white pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-cyan-950/50 rounded-lg border border-cyan-900/50">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-500 text-sm">StreamVibe management console</p>
          </div>
          <Badge className="ml-2 bg-cyan-900/50 text-cyan-400 border-cyan-800">Admin</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Users', value: stats.users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-950/30 border-blue-900/50' },
            { label: 'Active Keys', value: stats.activeKeys, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-950/30 border-green-900/50' },
            { label: 'Total Keys', value: stats.totalKeys, icon: Key, color: 'text-purple-400', bg: 'bg-purple-950/30 border-purple-900/50' },
            { label: 'Active Plans', value: stats.activePlans, icon: CreditCard, color: 'text-cyan-400', bg: 'bg-cyan-950/30 border-cyan-900/50' },
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

        <Tabs defaultValue="keys">
          <TabsList className="bg-[#12121e] border border-slate-800 p-1 mb-6 h-auto gap-1">
            <TabsTrigger value="keys" className="data-[state=active]:bg-purple-900/50 data-[state=active]:text-purple-300">
              <Key className="w-4 h-4 mr-2" />License Keys
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-900/50 data-[state=active]:text-blue-300"
              onClick={() => { if (users.length === 0) loadUsers() }}>
              <Users className="w-4 h-4 mr-2" />Users
            </TabsTrigger>
          </TabsList>

          {/* KEYS TAB */}
          <TabsContent value="keys" className="space-y-6">
            {/* Generate card */}
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2"><Key className="w-5 h-5 text-purple-400" />Generate License Keys</CardTitle>
                <CardDescription className="text-slate-500">Keys are created with &apos;inactive&apos; status until redeemed by a user.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Quantity (max 50)</label>
                    <Input type="number" min={1} max={50} value={genCount}
                      onChange={e => setGenCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-24 bg-[#0d0d1a] border-slate-700 text-white" />
                  </div>
                  <div className="flex-1 min-w-48">
                    <label className="text-xs text-slate-400 mb-1 block">Assign to Plan (optional)</label>
                    <select value={genPlanId} onChange={e => setGenPlanId(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-slate-700 bg-[#0d0d1a] text-white text-sm">
                      <option value="">— No specific plan —</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.billing_interval !== 'lifetime' ? `(${p.billing_interval})` : '(lifetime)'} — ${p.price}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={generateKeys} disabled={generating}
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold min-w-36">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                    Generate {genCount > 1 ? `${genCount} Keys` : 'Key'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Keys table */}
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-white text-lg">All License Keys</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <Input placeholder="Search keys..." value={keySearch} onChange={e => setKeySearch(e.target.value)}
                      className="pl-9 bg-[#0d0d1a] border-slate-700 text-white w-48" />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => loadKeys()} disabled={loadingKeys}
                    className="border-slate-700 text-slate-400 hover:text-white">
                    {loadingKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {keys.length === 0 && !loadingKeys ? (
                  <div className="text-center py-12">
                    <Key className="w-12 h-12 mx-auto mb-4 text-slate-700" />
                    <p className="text-slate-500">No keys loaded yet.</p>
                    <Button variant="outline" className="mt-4 border-slate-700 text-slate-400 hover:text-white" onClick={loadKeys}>Load Keys</Button>
                  </div>
                ) : loadingKeys ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-xs">
                          <th className="text-left pb-3 font-medium">Key Code</th>
                          <th className="text-left pb-3 font-medium">Status</th>
                          <th className="text-left pb-3 font-medium hidden md:table-cell">Redeemed</th>
                          <th className="text-left pb-3 font-medium hidden lg:table-cell">Expires</th>
                          <th className="text-right pb-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {filteredKeys.map(k => {
                          const sm = KEY_STATUS_META[k.status]
                          const StatusIcon = sm.icon
                          return (
                            <tr key={k.id} className="hover:bg-slate-800/20">
                              <td className="py-3 pr-4">
                                <span className="font-mono text-white tracking-wider text-xs">{k.key_code}</span>
                              </td>
                              <td className="py-3 pr-4">
                                <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', sm.bg, sm.color)}>
                                  <StatusIcon className="w-3 h-3" />{sm.label}
                                </span>
                              </td>
                              <td className="py-3 pr-4 hidden md:table-cell text-slate-500 text-xs">
                                {k.redeemed_at ? new Date(k.redeemed_at).toLocaleDateString() : '—'}
                              </td>
                              <td className="py-3 pr-4 hidden lg:table-cell text-slate-500 text-xs">
                                {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Never'}
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-white" onClick={() => copyKey(k.key_code)}>
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  {k.status === 'active' && (
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-400" onClick={() => updateKeyStatus(k.id, 'banned')}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                  {k.status === 'banned' && (
                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-400 hover:text-white" onClick={() => updateKeyStatus(k.id, 'inactive')}>
                                      Unban
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <p className="text-xs text-slate-600 mt-4 text-right">Showing {filteredKeys.length} of {keys.length} keys</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">Registered Users</CardTitle>
                  <CardDescription className="text-slate-500">{stats.users} total accounts</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={loadUsers} disabled={loadingUsers} className="border-slate-700 text-slate-400 hover:text-white">
                  {loadingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-blue-400 animate-spin" /></div>
                ) : users.length === 0 ? (
                  <p className="text-center text-slate-500 py-12">No users. Click Refresh to load.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-xs">
                          <th className="text-left pb-3 font-medium">Username</th>
                          <th className="text-left pb-3 font-medium hidden md:table-cell">ID</th>
                          <th className="text-left pb-3 font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-slate-800/20">
                            <td className="py-3 pr-4">
                              <span className="text-white font-medium">{u.username || <span className="text-slate-500 italic">unnamed</span>}</span>
                            </td>
                            <td className="py-3 pr-4 hidden md:table-cell">
                              <span className="font-mono text-xs text-slate-500">{u.id.slice(0, 12)}…</span>
                            </td>
                            <td className="py-3 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
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
