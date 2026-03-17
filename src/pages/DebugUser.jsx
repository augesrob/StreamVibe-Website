import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { syncTikTokVideos } from '@/lib/tiktok-auth';
import { Shield, RefreshCw, Key, User, Database, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';

const DebugUser = () => {
  const { user, session, isAdmin, isModerator } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dbProfile, setDbProfile] = useState(null);
  const [tiktokUser, setTikTokUser] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [showFullKey, setShowFullKey] = useState(false);
  const [stats, setStats] = useState({ videos: 0 });

  const fetchData = async () => {
    if (!user) return;
    
    // Profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setDbProfile(profile);

    // TikTok User
    const { data: tkUser } = await supabase.from('tiktok_users').select('*').eq('id', user.id).single();
    setTikTokUser(tkUser);

    // Stats
    const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    setStats({ videos: count || 0 });

    // API Key
    if (isAdmin) {
        const { data: key } = await supabase.from('api_keys').select('*').eq('user_id', user.id).eq('is_active', true).single();
        setApiKey(key);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, isAdmin]);

  const handleMakeAdmin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dev_make_me_admin');
      if (error) throw error;
      if (data.success) {
        toast({ title: "Success! 🚀", description: "You are now an Admin." });
        window.location.reload(); 
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForceSync = async () => {
      if (!user?.id) return;
      setSyncing(true);
      try {
          await syncTikTokVideos(user.id);
          toast({ title: "Sync Complete" });
          fetchData();
      } catch (e) {
          toast({ variant: "destructive", title: "Sync Failed", description: e.message });
      } finally {
          setSyncing(false);
      }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  if (!user) return <div className="p-8 text-center text-white">Please log in.</div>;

  return (
    <div className="min-h-screen pt-24 px-4 bg-slate-950 text-white pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
               <Shield className="w-8 h-8 text-cyan-500" />
               <h1 className="text-3xl font-bold">User Debugger</h1>
            </div>
            <Button onClick={handleForceSync} disabled={syncing} className="bg-purple-600">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <RefreshCw className="w-4 h-4 mr-2"/>}
                Force TikTok Sync
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auth & Identity */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="text-slate-400">ID:</span><span className="font-mono text-xs">{user.id}</span>
                    <span className="text-slate-400">Email:</span><span>{user.email}</span>
                    <span className="text-slate-400">Role:</span><span>{dbProfile?.role}</span>
                </div>
            </CardContent>
          </Card>

          {/* TikTok Status */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader><CardTitle>TikTok Integration</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="text-slate-400">Status:</span>
                    <Badge variant={tiktokUser ? "default" : "destructive"}>{tiktokUser ? "Linked" : "Not Linked"}</Badge>
                    
                    <span className="text-slate-400">Username:</span>
                    <span className="text-cyan-400">{tiktokUser?.username || dbProfile?.username}</span>
                    
                    <span className="text-slate-400">Synced Videos:</span>
                    <span>{stats.videos}</span>
                    
                    <span className="text-slate-400">Last Sync:</span>
                    <span className="text-xs">{dbProfile?.updated_at ? new Date(dbProfile.updated_at).toLocaleString() : '-'}</span>
                </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800 md:col-span-2">
             <CardContent className="pt-6">
                 <Button onClick={handleMakeAdmin} disabled={loading} className="w-full bg-slate-800 hover:bg-slate-700">
                    {loading ? "Processing..." : "Fix Permissions / Make Admin"}
                 </Button>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DebugUser;