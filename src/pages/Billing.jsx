import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Check, Loader2, CheckCircle2, ArrowRight, Key, Sparkles, Zap, Star, Crown, Gift, Clock, ExternalLink, Monitor, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { callEdgeFunctionWithTimeout } from '@/lib/edge-functions';
import PayPalCheckoutOfficial from '@/components/PayPalCheckoutOfficial';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const INTERVALS = ['monthly', 'quarterly', 'yearly', 'lifetime'];
const TIERS     = ['free', 'basic', 'pro', 'legend'];

const tierMeta = {
  free:   { label: 'Free',   icon: Gift,  color: 'text-slate-400',  border: 'border-slate-700' },
  basic:  { label: 'Basic',  icon: Zap,   color: 'text-blue-400',   border: 'border-blue-800'  },
  pro:    { label: 'Pro',    icon: Star,  color: 'text-cyan-400',   border: 'border-cyan-700'  },
  legend: { label: 'Legend', icon: Crown, color: 'text-purple-400', border: 'border-purple-700'},
};
const intervalLabel = { monthly:'Monthly', quarterly:'Quarterly', yearly:'Yearly', lifetime:'Lifetime' };

function cn2(...c) { return c.filter(Boolean).join(' '); }

const Billing = () => {
  const { user, loading: authLoading, userPlans, refreshPlans } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [plans, setPlans]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [interval, setInterval]   = useState('monthly');
  const [buyingPlan, setBuyingPlan] = useState(null); // plan object for PayPal dialog
  const [userKeys, setUserKeys]       = useState([]);
  const [bonusDevices, setBonusDevices] = useState(0);

  // Derived: HWID add-on plans (custom_note = 'Add-on')
  const addonPlans = plans.filter(p => p.custom_note === 'Add-on' && p.max_devices != null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user, navigate]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [{ data: plansData }, { data: keysData }, { data: profileData }] = await Promise.all([
      supabase.from('plans').select('*').order('sort_order'),
      supabase.from('license_keys').select('id,key_code,max_devices,hwid_device_count,status,expires_at').eq('user_id', user.id).eq('status','active'),
      supabase.from('profiles').select('bonus_devices').eq('id', user.id).single(),
    ]);
    setPlans(plansData || []);
    setUserKeys(keysData || []);
    setBonusDevices(profileData?.bonus_devices || 0);
    await refreshPlans();
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    try {
      const { data, error } = await callEdgeFunctionWithTimeout('redeem-license-key', {
        body: { key_code: redeemCode.trim() },
      });
      if (error) throw new Error(error.message);
      if (data?.success) {
        toast({ title: 'Key Redeemed!', description: data.message });
        setRedeemCode('');
        loadData();
      } else {
        toast({ variant: 'destructive', title: 'Invalid Key', description: data?.message || 'Could not redeem key.' });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setRedeeming(false);
    }
  };

  const isOwned = (planId) =>
    (userPlans||[]).some(up => up.plan_id === planId && (!up.expires_at || new Date(up.expires_at) > new Date()));

  const getDaysLeft = (expires) => {
    if (!expires) return 'Lifetime Access';
    const days = Math.max(0, Math.ceil((new Date(expires) - Date.now()) / 86400000));
    return `${days} days remaining`;
  };

  // Find plan for a tier+interval combination
  const planFor = (tier) =>
    tier === 'free'
      ? plans.find(p => p.tier === 'free')
      : plans.find(p => p.tier === tier && p.billing_interval === interval)
        || plans.find(p => p.tier === tier); // fallback to any interval

  // Called by PayPal after successful addon purchase — permanently adds to account (profiles.bonus_devices)
  const handleAddonPurchase = async (addonPlan) => {
    if (!addonPlan?.max_devices) { loadData(); return; }
    // Fetch current bonus_devices from profile
    const { data: profile } = await supabase
      .from('profiles').select('bonus_devices').eq('id', user.id).single();
    const current = profile?.bonus_devices || 0;
    const newTotal = current + addonPlan.max_devices;
    const { error } = await supabase
      .from('profiles').update({ bonus_devices: newTotal }).eq('id', user.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error applying add-on', description: error.message });
    } else {
      toast({
        title: addonPlan.max_devices + ' device slot' + (addonPlan.max_devices !== 1 ? 's' : '') + ' added to your account!',
        description: 'You now have ' + newTotal + ' permanent bonus slot' + (newTotal !== 1 ? 's' : '') + ' across all your keys.',
      });
      loadData();
    }
  };

  if (authLoading || loading) return (
    <div className="min-h-screen pt-24 flex items-center justify-center bg-[#08080f]">
      <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pt-24 px-4 bg-[#08080f] text-white pb-20">
      <Helmet><title>Billing & Plans | StreamVibe</title></Helmet>

      {/* PayPal purchase dialog */}
      {buyingPlan && (
        <Dialog open={true} onOpenChange={() => setBuyingPlan(null)}>
          <DialogContent className="bg-[#1a1a24] text-white border-slate-700">
            <DialogHeader>
              <DialogTitle>Purchase {buyingPlan.name}</DialogTitle>
              <DialogDescription className="text-slate-400">Complete your purchase via PayPal.</DialogDescription>
            </DialogHeader>
            <div className="py-3 space-y-3">
              <div className="flex justify-between items-center p-3 bg-[#0d0d1a] rounded-lg">
                <span className="text-slate-400">Price</span>
                <span className="font-bold">${buyingPlan.price} / {buyingPlan.billing_interval}</span>
              </div>
            </div>
            <DialogFooter>
              <PayPalCheckoutOfficial
                plan_id={buyingPlan.id} amount={buyingPlan.price}
                currency="USD" planName={buyingPlan.name}
                planInterval={buyingPlan.billing_interval}
                className="w-full"
                onSuccess={buyingPlan._isAddon ? () => { setBuyingPlan(null); handleAddonPurchase(buyingPlan); } : undefined}
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="max-w-6xl mx-auto space-y-10">
        <div>
          <h1 className="text-3xl font-bold mb-1">Billing &amp; Plans</h1>
          <p className="text-slate-400">Manage your subscription and redeem license keys.</p>
        </div>

        {/* Active Plans */}
        {userPlans && userPlans.length > 0 && (
          <Card className="bg-[#12121e] border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-cyan-400" />Your Active Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {userPlans.map(up => (
                  <div key={up.id} className="bg-[#0d0d1a] p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{up.plans?.name || 'Unknown Plan'}</p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-cyan-400">{getDaysLeft(up.expires_at)}</span>
                      </div>
                    </div>
                    <Badge className="bg-green-900/50 text-green-400 border border-green-800">Active</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-400" />Available Plans
          </h2>

          {/* Interval toggle */}
          <div className="flex mb-5">
            <div className="inline-flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
              {INTERVALS.map(iv => (
                <button key={iv} onClick={() => setInterval(iv)}
                  className={cn2('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    interval === iv
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  )}>
                  {intervalLabel[iv]}
                </button>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map(tier => {
              const plan = planFor(tier);
              if (!plan) return null;
              const meta  = tierMeta[tier];
              const Icon  = meta.icon;
              const owned = isOwned(plan.id);
              return (
                <Card key={tier} className={cn2('flex flex-col bg-[#0d0d1a] border transition-all hover:-translate-y-0.5', meta.border, owned && 'ring-1 ring-green-700')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn2('inline-flex items-center gap-1 text-xs font-bold', meta.color)}>
                        <Icon className="w-3.5 h-3.5" />{meta.label}
                      </span>
                      {owned && <Badge className="bg-green-900/50 text-green-400 border-green-800 text-[10px]">Owned</Badge>}
                    </div>
                    <p className="text-2xl font-extrabold text-white">{plan.price === 0 ? 'Free' : `$${plan.price}`}</p>
                    <p className="text-xs text-slate-500">
                      {plan.price === 0 ? 'No card needed'
                        : plan.billing_interval === 'lifetime' ? 'one-time payment'
                        : `/${plan.billing_interval === 'monthly' ? 'mo' : plan.billing_interval === 'quarterly' ? 'qtr' : 'yr'}`}
                    </p>
                    {plan.custom_note && <p className={cn2('text-xs font-medium mt-1', meta.color)}>{plan.custom_note}</p>}
                  </CardHeader>
                  <CardContent className="flex-grow pb-3">
                    <ul className="space-y-2">
                      {Array.isArray(plan.features) && plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className={cn2('w-3.5 h-3.5 shrink-0 mt-0.5', meta.color)} />{f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {owned ? (
                      <Button disabled className="w-full text-xs bg-green-900/20 text-green-500 border border-green-900">
                        <Check className="w-3 h-3 mr-1" />Active
                      </Button>
                    ) : tier === 'free' ? (
                      <Button asChild className="w-full text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white">
                        <Link to="/signup">Sign Up Free</Link>
                      </Button>
                    ) : (
                      <Button onClick={() => setBuyingPlan(plan)}
                        className="w-full text-xs bg-[#1a1a2e] hover:bg-slate-800 border border-slate-700 text-white group font-bold">
                        <ExternalLink className="w-3 h-3 mr-1" />Pay with PayPal
                        <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {/* HWID Device Slot Add-ons */}
        {addonPlans.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-cyan-400" />Device Slot Add-ons
            </h2>
            <p className="text-slate-500 text-sm mb-4">
              Stack extra device slots onto your existing license key. Purchases are permanent and cumulative.
            </p>
            <div className="bg-[#0d0d1a] border border-slate-800 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-slate-400">Account bonus slots:</span>
                <span className="text-cyan-400 font-bold text-base">+{bonusDevices}</span>
              </div>
              {userKeys.length > 0 && (
                <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
                  <span className="text-slate-400">Active key:</span>
                  <span className="font-mono text-white text-xs">{userKeys[0].key_code}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{userKeys[0].hwid_device_count || 0} / <span className="text-cyan-400 font-bold">{(userKeys[0].max_devices || 5) + bonusDevices}</span> effective slots</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {addonPlans.sort((a,b) => a.max_devices - b.max_devices).map(plan => (
                <Card key={plan.id} className="bg-[#0d0d1a] border border-cyan-900/40 flex flex-col hover:border-cyan-600/60 transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">🖥️</span>
                      <div>
                        <p className="font-bold text-white text-sm">{plan.name}</p>
                        <p className="text-xs text-cyan-400">+{plan.max_devices} device slot{plan.max_devices !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-white">${plan.price}</p>
                    <p className="text-xs text-slate-500">one-time · permanent</p>
                  </CardHeader>
                  <CardContent className="flex-grow pb-2">
                    <p className="text-xs text-slate-400">
                      Adds {plan.max_devices} permanent device slot{plan.max_devices !== 1 ? 's' : ''} to your active license key.
                      <span className="text-cyan-400"> Bonus total after purchase: +{bonusDevices + plan.max_devices} slots on your account.</span>
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => setBuyingPlan({...plan, _isAddon: true})}
                      className="w-full text-xs bg-cyan-900/30 hover:bg-cyan-900/60 border border-cyan-800 text-cyan-300 font-bold">
                      <Plus className="w-3 h-3 mr-1" />Add {plan.max_devices} Slot{plan.max_devices !== 1 ? 's' : ''}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Redeem Key */}
        <Card className="bg-[#12121e] border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Key className="w-5 h-5 text-purple-400" />Redeem License Key
            </CardTitle>
            <CardDescription className="text-slate-400">Enter a license key to activate a plan instantly.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="SV-XXXX-XXXX-XXXX-XXXX"
                value={redeemCode}
                onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleRedeem()}
                className="bg-[#0d0d1a] border-slate-700 font-mono tracking-widest text-white flex-1"
              />
              <Button onClick={handleRedeem} disabled={redeeming || !redeemCode.trim()}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white min-w-28 font-bold">
                {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redeem'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bottom links */}
        <div className="flex gap-4 text-sm">
          <Link to="/dashboard" className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
            <ArrowRight className="w-3.5 h-3.5" />Dashboard
          </Link>
          <a href="/#pricing" className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
            <ArrowRight className="w-3.5 h-3.5" />Compare Plans
          </a>
        </div>
      </div>
    </div>
  );
};

export default Billing;
