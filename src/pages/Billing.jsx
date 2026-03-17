
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Crown, CheckCircle2, CreditCard, Sparkles, ArrowRight, Loader2, Shield, Monitor, RefreshCw, Check, Calendar, Laptop, Lock } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import PayPalCheckoutOfficial from '@/components/PayPalCheckoutOfficial';
import { callEdgeFunctionWithTimeout } from '@/lib/edge-functions';
import { getClientIPAndHWID } from '@/lib/hwid-generator';

const Billing = () => {
  const { user, loading: authLoading, userPlans, refreshPlans } = useAuth();
  const { toast } = useToast();
  
  const [lockInfo, setLockInfo] = useState({ hwid: null, ip_address: null });
  const [loading, setLoading] = useState(true);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [plans, setPlans] = useState([]);
  const [resettingHwid, setResettingHwid] = useState(false);
  
  const [paypalStatus, setPaypalStatus] = useState({ 
    checked: false, connected: false, loading: true, error: null
  });

  const checkPayPalConnection = async () => {
    try {
      setPaypalStatus({ checked: true, connected: true, loading: false, error: null });
    } catch (err) {
      setPaypalStatus({ checked: true, connected: false, loading: false, error: "Connection Check Failed" });
    }
  };

  const fetchBillingData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch lock info from active license key
      const { data: licenseData } = await supabase
        .from('license_keys')
        .select('hwid, ip_address')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      setLockInfo(licenseData || { hwid: null, ip_address: null });
      
      // Updated to fetch from 'plans' table
      const { data: planList } = await supabase.from('plans').select('*').order('price', { ascending: true });
      setPlans(planList || []);
      await refreshPlans();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchBillingData();
      checkPayPalConnection();
    } else if (!authLoading && !user) {
      setLoading(false);
      setPaypalStatus(prev => ({ ...prev, loading: false }));
    }
  }, [user, authLoading]);

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;

    setRedeeming(true);
    try {
      const { ip, hwid } = await getClientIPAndHWID();

      const { data, error } = await callEdgeFunctionWithTimeout('redeem-license-key', {
        body: { 
            key_code: redeemCode.trim(),
            current_ip: ip,
            current_hwid: hwid
        }
      });
      
      if (error) throw new Error(error.message);

      if (data.success) {
        toast({
           title: "Success! Plan Activated",
           description: data.message,
           className: "bg-green-900 border-green-800 text-white"
        });
        setRedeemCode('');
        await fetchBillingData();
      } else {
        toast({ variant: "destructive", title: "Redemption Failed", description: data.message });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message || "An unexpected error occurred" });
    } finally {
      setRedeeming(false);
    }
  };

  const handleHwidReset = async () => {
     setResettingHwid(true);
     try {
        const { data, error } = await supabase.rpc('reset_hwid');
        if (error) throw error;
        
        if (data.success) {
           toast({ title: "Reset Successful", description: data.message });
           fetchBillingData();
        } else {
           toast({ variant: "destructive", title: "Reset Failed", description: data.message });
        }
     } catch (err) {
        toast({ variant: "destructive", title: "Error", description: err.message });
     } finally {
        setResettingHwid(false);
     }
  };

  const getUserPlanForPlanId = (planId) => {
    if (!userPlans) return null;
    return userPlans.find(up => up.plan_id === planId && (up.expires_at === null || new Date(up.expires_at) > new Date()));
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return "Lifetime";
    const diff = new Date(expiryDate) - new Date();
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    return `${days} Days`;
  };

  if (authLoading) return <div className="min-h-screen pt-24 text-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen pt-24 px-4 bg-[#0a0a0f] text-white pb-20">
      <Helmet><title>Billing & Subscription | StreamVibe</title></Helmet>
      
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
            <p className="text-gray-400">Manage your plans, redeem keys, and view security settings.</p>
          </div>
          
          {!paypalStatus.loading && (
             <div className="px-4 py-2 rounded-full border text-sm font-medium flex items-center gap-2 bg-green-950/30 border-green-800 text-green-400">
                <Check className="w-4 h-4" /> PayPal Ready
             </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Card className="bg-[#1a1a24] border-gray-800 relative overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Sparkles className="w-5 h-5 text-cyan-400" />
                           Your Active Plans
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {userPlans && userPlans.length > 0 ? (
                            <div className="space-y-4">
                                {userPlans.map(plan => (
                                    <div key={plan.id} className="bg-[#12121a] p-4 rounded-lg border border-gray-800 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-lg text-white">{plan.plans?.name || 'Unknown Plan'}</h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                Expires: <span className="text-cyan-400">{getDaysRemaining(plan.expires_at)}</span> 
                                            </div>
                                        </div>
                                        <Badge className="bg-green-900/50 text-green-400 border-green-800">Active</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                               <p className="text-gray-400">You don't have any active plans yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Crown className="w-5 h-5 text-purple-500" /> Available Plans
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plans.map(plan => {
                            const userPlan = getUserPlanForPlanId(plan.id);
                            return (
                                <Card key={plan.id} className={cn("bg-[#1a1a24] transition-all relative overflow-hidden border-gray-800")}>
                                    {userPlan && <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 z-10">OWNED</div>}
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg">{plan.name}</CardTitle>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-500 font-mono border border-gray-700 rounded px-1">{plan.duration_days} Days</span>
                                                </div>
                                            </div>
                                            <span className="text-cyan-400 font-bold">${plan.price}</span>
                                        </div>
                                        <CardDescription className="text-xs mt-2">Access for {plan.duration_days} days</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        <ul className="grid grid-cols-1 gap-1">
                                            {Array.isArray(plan.features) && plan.features.map((f, i) => (
                                                <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                                    <CheckCircle2 className="w-3 h-3 text-cyan-500/50 shrink-0 mt-0.5" /> 
                                                    <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter className="pt-4">
                                        {userPlan ? (
                                             <Button disabled className="w-full bg-green-900/20 text-green-500 border border-green-900/50"><Check className="w-4 h-4 mr-2" /> Plan Active</Button>
                                        ) : (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button className="w-full bg-[#12121a] hover:bg-cyan-950 border border-gray-700 text-white hover:text-cyan-400 group">
                                                        Add Plan <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="bg-[#1a1a24] text-white border-gray-800">
                                                    <DialogHeader>
                                                        <DialogTitle>Purchase {plan.name}</DialogTitle>
                                                        <DialogDescription>Add this plan to your account.</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-4 space-y-4">
                                                        <div className="flex justify-between items-center p-3 bg-[#12121a] rounded-lg">
                                                            <span className="text-gray-400">Price</span>
                                                            <span className="font-bold">${plan.price} / {plan.duration_days} days</span>
                                                        </div>
                                                        <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-800/50 text-xs text-yellow-200 flex items-start gap-2">
                                                           <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                                                           <span>Note: This subscription will lock your account to your current device (IP and Hardware ID) to prevent sharing.</span>
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <PayPalCheckoutOfficial 
                                                            plan_id={plan.id}
                                                            amount={plan.price}
                                                            currency="USD"
                                                            planName={plan.name}
                                                            planInterval={`${plan.duration_days} days`}
                                                            className="w-full"
                                                        />
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                <Card className="bg-[#1a1a24] border-gray-800">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-400" />Redeem License Key</CardTitle>
                     <CardDescription>Enter your license key or promotional code.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <form onSubmit={handleRedeem} className="flex gap-4">
                        <Input 
                            placeholder="XXXX-XXXX-XXXX-XXXX" 
                            value={redeemCode}
                            onChange={(e) => setRedeemCode(e.target.value)}
                            className="bg-[#12121a] border-gray-700 font-mono uppercase tracking-widest"
                        />
                        <Button type="submit" disabled={redeeming || !redeemCode} className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white min-w-[120px]">
                           {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redeem'}
                        </Button>
                     </form>
                  </CardContent>
               </Card>
            </div>

            <div className="space-y-8">
               <Card className="bg-[#1a1a24] border-gray-800">
                   <CardHeader>
                       <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-red-400" /> Security & Locks</CardTitle>
                       <CardDescription>Your account is locked to the following identifiers.</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-6">
                       <div className="space-y-4">
                           <div className="flex items-center justify-between p-3 bg-[#12121a] rounded-lg border border-gray-800">
                               <div className="flex items-center gap-3">
                                   <Laptop className="w-5 h-5 text-gray-500" />
                                   <div>
                                       <p className="text-sm font-medium">Hardware ID</p>
                                       <p className="text-xs text-gray-500 font-mono max-w-[120px] truncate" title={lockInfo?.hwid}>{lockInfo?.hwid || 'Not Set'}</p>
                                   </div>
                               </div>
                               <Badge variant={lockInfo?.hwid ? "destructive" : "secondary"}>
                                   {lockInfo?.hwid ? "Locked" : "Open"}
                               </Badge>
                           </div>

                           <div className="flex items-center justify-between p-3 bg-[#12121a] rounded-lg border border-gray-800">
                               <div className="flex items-center gap-3">
                                   <Monitor className="w-5 h-5 text-gray-500" />
                                   <div>
                                       <p className="text-sm font-medium">IP Address</p>
                                       <p className="text-xs text-gray-500 font-mono">{lockInfo?.ip_address || 'Not Set'}</p>
                                   </div>
                               </div>
                               <Badge variant={lockInfo?.ip_address ? "destructive" : "secondary"}>
                                   {lockInfo?.ip_address ? "Locked" : "Floating"}
                               </Badge>
                           </div>
                       </div>
                       
                       <div className="pt-4 border-t border-gray-800">
                           <Button 
                                variant="outline" 
                                className="w-full border-red-900/30 hover:bg-red-950/20 hover:text-red-400 text-gray-400"
                                onClick={handleHwidReset}
                                disabled={resettingHwid}
                           >
                               {resettingHwid ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                               Reset Locks
                           </Button>
                           <p className="text-xs text-gray-600 mt-2 text-center">Resetting has a 24-hour cooldown.</p>
                       </div>
                   </CardContent>
               </Card>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
