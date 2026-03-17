import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from "@/components/ui/use-toast";
import { validateTikTokToken } from '@/lib/tiktok-token-validator';
import { initiateTikTokLogin } from '@/lib/tiktok-auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Activity, Key, ShieldCheck } from 'lucide-react';

const TikTokDiagnostics = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [statusData, setStatusData] = useState({
        config: { clientId: null },
        token: { exists: false, updated_at: null, valid: null },
        db: { accountCount: 0 },
    });

    const fetchDiagnostics = async () => {
        setLoading(true);
        try {
            // 1. Config Check
            const { data: settings } = await supabase.from('system_settings').select('value').eq('key', 'tiktok_client_key').single();
            
            // 2. Token Status - check tiktok_accounts table directly
            const { data: account } = await supabase.from('tiktok_accounts').select('*').eq('user_id', user.id).maybeSingle();
            
            // 3. Database Stats - check general account count
            const { count: accountCount } = await supabase.from('tiktok_accounts').select('*', { count: 'exact', head: true });

            const hasToken = !!account?.access_token;
            const lastUpdate = account?.updated_at;

            setStatusData({
                config: {
                    clientId: settings?.value || 'Using Default/Env',
                },
                token: {
                    exists: hasToken,
                    updated_at: lastUpdate,
                    valid: null // Will be updated by verify
                },
                db: { accountCount: accountCount || 0 },
            });
        } catch (error) {
            console.error("Diagnostic Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDiagnostics();
    }, []);

    const handleVerifyAuth = async () => {
        setVerifying(true);
        try {
            // Task: Wrap the verification call with a timeout since we can't edit the hidden validator file
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timed out')), 5000);
            });

            // Race the validate call against the timeout
            const result = await Promise.race([
                validateTikTokToken(user.id),
                timeoutPromise
            ]);

            setStatusData(prev => ({
                ...prev,
                token: { ...prev.token, valid: result.isValid, validationDetails: result }
            }));
            
            if (result.isValid) {
                toast({ title: "Valid", description: "TikTok authentication is active and valid." });
            } else {
                toast({ variant: "destructive", title: "Invalid", description: result.errorMessage || "Token expired or invalid." });
            }
        } catch (e) {
            const message = e.message === 'Request timed out' 
                ? "Verification timed out. Please try again." 
                : (e.message || "An unexpected error occurred");
                
            toast({ variant: "destructive", title: "Error", description: message });
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Activity className="w-6 h-6 text-cyan-500" />
                        TikTok API Diagnostics
                    </h2>
                    <p className="text-gray-400">Real-time status check of your TikTok integration</p>
                </div>
                <Button variant="outline" onClick={fetchDiagnostics} size="sm" disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Token Status */}
                <Card className="bg-[#1a1a24] border-gray-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                            <Key className="w-4 h-4" /> Authentication
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span>Token Present</span>
                                <Badge variant={statusData.token.exists ? "default" : "destructive"}>
                                    {statusData.token.exists ? "Yes" : "No"}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Last Updated</span>
                                <span className="text-xs text-gray-500">{statusData.token.updated_at ? new Date(statusData.token.updated_at).toLocaleString() : 'Never'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Status</span>
                                {statusData.token.valid === null ? (
                                    <span className="text-gray-500">Unchecked</span>
                                ) : (
                                    <Badge variant={statusData.token.valid ? "success" : "destructive"} className={statusData.token.valid ? "bg-green-600" : ""}>
                                        {statusData.token.valid ? "Valid" : "Invalid"}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button size="sm" onClick={handleVerifyAuth} disabled={verifying} className="w-full bg-blue-600 hover:bg-blue-700">
                                {verifying ? <Loader2 className="w-3 h-3 animate-spin mr-2"/> : <ShieldCheck className="w-3 h-3 mr-2"/>}
                                Verify Authentication
                            </Button>
                            {!statusData.token.valid && statusData.token.valid !== null && (
                                <Button size="sm" variant="outline" onClick={initiateTikTokLogin} className="w-full border-red-500 text-red-500 hover:bg-red-500/10">
                                    Re-Authenticate
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* DB Stats */}
                <Card className="bg-[#1a1a24] border-gray-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Database Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white mb-1">{statusData.db.accountCount}</div>
                        <p className="text-xs text-gray-500">Linked TikTok Accounts</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TikTokDiagnostics;