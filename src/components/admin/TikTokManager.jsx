import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Search, Trash2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

const TikTokManager = () => {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [tiktokAccount, setTiktokAccount] = useState(null);
    const [resetting, setResetting] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setUser(null);
        setTiktokAccount(null);

        try {
            // 1. Find User
            let { data: users, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`username.eq.${searchQuery},id.eq.${searchQuery}`)
                .limit(1);

            if (error) throw error;
            if (!users || users.length === 0) {
                toast({ variant: "destructive", title: "User not found", description: "No user matching that username or ID." });
                setLoading(false);
                return;
            }

            const targetUser = users[0];
            setUser(targetUser);

            // 2. Fetch TikTok Account
            const { data: account, error: accountError } = await supabase
                .from('tiktok_accounts')
                .select('*')
                .eq('user_id', targetUser.id)
                .maybeSingle();
            
            if (!accountError) setTiktokAccount(account);

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleUnlink = async () => {
        if (!user) return;
        setResetting(true);

        try {
            // Delete from tiktok_accounts
            const { error: deleteError } = await supabase
                .from('tiktok_accounts')
                .delete()
                .eq('user_id', user.id);

            if (deleteError) throw deleteError;

            // Clear profile flags
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    tiktok_access_token: null, 
                    tiktok_refresh_token: null,
                    is_live: false
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            toast({ 
                title: "Unlink Successful", 
                description: `TikTok account for ${user.username} has been unlinked.` 
            });
            
            // Refresh state
            setUser(prev => ({ ...prev, tiktok_access_token: null }));
            setTiktokAccount(null);
            
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setResetting(false);
        }
    };

    const isConnected = !!tiktokAccount;

    return (
        <Card className="bg-[#1a1a24] border-gray-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-purple-500" />
                    TikTok Account Manager
                </CardTitle>
                <CardDescription>
                    Search for a user to inspect their TikTok connection status and force unlink if needed.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input 
                            placeholder="Enter Username or UUID..." 
                            className="pl-9 bg-[#12121a] border-gray-700 text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search User"}
                    </Button>
                </form>

                {/* Results Area */}
                {user && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                        {/* User Profile Summary */}
                        <div className="flex items-start justify-between p-4 bg-[#12121a] rounded border border-gray-800">
                            <div className="flex items-center gap-4">
                                <Avatar className="w-12 h-12 border border-gray-700">
                                    <AvatarImage src={user.avatar_url} />
                                    <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{user.username}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{user.id}</p>
                                    <div className="flex gap-2 mt-2">
                                        <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-600" : "bg-gray-700"}>
                                            {isConnected ? <CheckCircle2 className="w-3 h-3 mr-1"/> : <XCircle className="w-3 h-3 mr-1"/>}
                                            {isConnected ? "TikTok Connected" : "Not Connected"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {tiktokAccount && (
                             <div className="p-4 bg-gray-900/50 rounded border border-gray-800">
                                <h4 className="text-sm font-semibold text-gray-400 mb-2">Linked TikTok Account Details</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="text-gray-500">Display Name:</span> <span className="text-white">{tiktokAccount.display_name || '-'}</span></div>
                                    <div><span className="text-gray-500">Open ID:</span> <span className="text-white font-mono text-xs">{tiktokAccount.open_id?.substring(0, 10)}...</span></div>
                                    <div><span className="text-gray-500">Last Updated:</span> <span className="text-white">{new Date(tiktokAccount.updated_at).toLocaleDateString()}</span></div>
                                </div>
                             </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end pt-4 border-t border-gray-800">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={!isConnected} className="bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-200">
                                        <Trash2 className="w-4 h-4 mr-2" /> Force Unlink Account
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Unlink TikTok Account?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-gray-400">
                                            This action will forcibly disconnect the TikTok account for 
                                            <span className="text-white font-semibold"> {user.username}</span>.
                                            They will need to re-authenticate to use TikTok features.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="flex gap-2 justify-end mt-4">
                                        <AlertDialogCancel className="bg-transparent border-gray-700 text-white hover:bg-gray-800">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleUnlink} disabled={resetting} className="bg-red-600 hover:bg-red-700 text-white">
                                            {resetting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                                            Yes, Unlink
                                        </AlertDialogAction>
                                    </div>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default TikTokManager;