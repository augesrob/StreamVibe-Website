"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, Users, CreditCard, Key, Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface UserRow { id: string; username?: string | null; created_at: string }

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.push('/dashboard')
  }, [loading, user, isAdmin, router])

  const loadUsers = async () => {
    setLoadingUsers(true)
    const { data } = await supabase.from('profiles').select('id, username, created_at').limit(50)
    setUsers(data || [])
    setLoadingUsers(false)
  }

  const generateKey = async () => {
    setGenerating(true)
    const key = 'SV-' + Array.from({ length: 4 }, () => Math.random().toString(36).toUpperCase().substring(2, 6)).join('-')
    const { error } = await supabase.from('license_keys').insert({ key_code: key, status: 'inactive' })
    if (!error) toast({ title: 'Key Generated', description: key })
    else toast({ variant: 'destructive', title: 'Error', description: error.message })
    setGenerating(false)
  }

  if (loading || !isAdmin) return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>

  return (
    <div className="min-h-screen pt-24 px-4 bg-[#0a0a0f] text-white pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-cyan-500" />
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <Badge className="bg-cyan-900/50 text-cyan-400 border-cyan-800">Admin</Badge>
        </div>
        <Tabs defaultValue="overview">
          <TabsList className="bg-[#1a1a24] border border-gray-800 p-1 mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-900/50">Overview</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-900/50" onClick={loadUsers}><Users className="w-4 h-4 mr-2" />Users</TabsTrigger>
            <TabsTrigger value="keys" className="data-[state=active]:bg-purple-900/50"><Key className="w-4 h-4 mr-2" />License Keys</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Total Users', icon: Users, color: 'text-blue-400', desc: 'Registered accounts' },
                { title: 'Active Plans', icon: CreditCard, color: 'text-green-400', desc: 'Active subscriptions' },
                { title: 'License Keys', icon: Key, color: 'text-purple-400', desc: 'Generated keys' },
              ].map((s, i) => (
                <Card key={i} className="bg-[#1a1a24] border-gray-800">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">{s.title}</CardTitle>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-white">—</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="users">
            <Card className="bg-[#1a1a24] border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Users</CardTitle>
                <Button size="sm" variant="outline" onClick={loadUsers} className="border-gray-700 text-gray-300 hover:text-white">
                  <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {loadingUsers ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /></div> : (
                  <div className="space-y-2">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-[#12121a] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-white">{(u as any).username || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 font-mono">{u.id.slice(0, 8)}...</p>
                        </div>
                        <p className="text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                    {users.length === 0 && !loadingUsers && <p className="text-center text-gray-500 py-4">No users loaded. Click Refresh.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="keys">
            <Card className="bg-[#1a1a24] border-gray-800">
              <CardHeader><CardTitle className="text-white">License Key Management</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={generateKey} disabled={generating} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                  Generate Key
                </Button>
                <p className="text-xs text-gray-500">Generated keys are saved with &apos;inactive&apos; status until redeemed.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
