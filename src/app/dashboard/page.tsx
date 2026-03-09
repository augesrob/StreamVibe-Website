"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LayoutDashboard, Settings, Download, Loader2, Crown, Key, Calendar } from 'lucide-react'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  if (loading) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
    </div>
  )
  if (!user) return null

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen text-slate-100 pt-24">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
            Creator Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Welcome back, <span className="text-white font-medium">{user.user_metadata?.username || user.email}</span>
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-[#1a1a24] border border-gray-800 p-1 w-full flex flex-wrap justify-start h-auto gap-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300">
            <LayoutDashboard className="w-4 h-4 mr-2" />Overview
          </TabsTrigger>
          <TabsTrigger value="downloads" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300">
            <Download className="w-4 h-4 mr-2" />Downloads
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300">
            <Settings className="w-4 h-4 mr-2" />Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#1a1a24] border-gray-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-cyan-900 text-cyan-300">
                      {(user.user_metadata?.username || user.email || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-bold">{user.user_metadata?.username || 'StreamVibe User'}</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-[#12121a] rounded-lg">
                    <span className="text-gray-400 text-sm">Account Status</span>
                    <Badge className="bg-green-900/50 text-green-400 border-green-800">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#12121a] rounded-lg">
                    <span className="text-gray-400 text-sm">Member Since</span>
                    <span className="text-white text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a24] border-gray-800 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-400" /> Your Plan
                </CardTitle>
                <CardDescription className="text-gray-400">Manage your subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-4">No active plan. Upgrade to unlock all features.</p>
                  <a href="/billing" className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-md font-medium hover:from-cyan-600 hover:to-blue-700 transition-all">
                    <Key className="w-4 h-4" /> View Plans
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="downloads">
          <Card className="bg-[#1a1a24] border-gray-800 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-cyan-400" /> Available Downloads</CardTitle>
              <CardDescription className="text-gray-400">Access your licensed software</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10 text-gray-500">
                <Download className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Activate a plan to access downloads</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="bg-[#1a1a24] border-gray-800 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-cyan-400" /> Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-[#12121a] rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Email</p>
                  <p className="text-white">{user.email}</p>
                </div>
                <div className="p-4 bg-[#12121a] rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Username</p>
                  <p className="text-white">{user.user_metadata?.username || 'Not set'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
