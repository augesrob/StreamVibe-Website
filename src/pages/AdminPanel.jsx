import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { adminSupabase } from '@/lib/adminSupabaseClient';
import BulkAddTimeDialog from '@/components/admin/BulkAddTimeDialog';
import BulkStatusDialog  from '@/components/admin/BulkStatusDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Users, Key, Loader2, RefreshCw, Copy, CheckCircle, XCircle, Clock,
  CreditCard, Search, Edit2, Ban, RotateCcw, Trash2, Monitor, ChevronDown, ChevronUp,
  X, Plus, Save, DollarSign, Star, AlertTriangle, Unlock, Download, Github, Globe, MessageSquare } from 'lucide-react';
import AdminForumSettings from '@/components/forum/AdminForumSettings';

const KEY_STATUS_META = {
  inactive: { label: 'Inactive', color: 'text-slate-400', bg: 'bg-slate-800' },
  active:   { label: 'Active',   color: 'text-green-400', bg: 'bg-green-900/40' },
  expired:  { label: 'Expired',  color: 'text-orange-400', bg: 'bg-orange-900/30' },
  banned:   { label: 'Banned',   color: 'text-red-400',   bg: 'bg-red-900/30' },
};
const TIER_COLORS = {
  free: 'text-slate-400 bg-slate-800', basic: 'text-blue-300 bg-blue-900/40',
  pro: 'text-purple-300 bg-purple-900/40', legend: 'text-yellow-300 bg-yellow-900/40',
};
const TIERS = ['free', 'basic', 'pro', 'legend'];
const INTERVALS = ['monthly', 'quarterly', 'yearly', 'lifetime', 'one-time'];
function cn(...c) { return c.filter(Boolean).join(' '); }
function generateKeyCode() {
  return 'SV-' + Array.from({length:4}, () => Math.random().toString(36).toUpperCase().substring(2,6)).join('-');
}

// ── User Edit Modal ───────────────────────────────────────────────────────────
function UserEditModal({ user, plans, onClose, onSaved, onRefresh, toast }) {
  const [username, setUsername] = useState(user.username || '');
  const [isBanned, setIsBanned] = useState(user.is_banned);
  const [saving, setSaving] = useState(false);
  const [grantPlanId, setGrantPlanId] = useState('');
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [removingKeyId, setRemovingKeyId] = useState(null);
  const [resettingHwidId, setResettingHwidId] = useState(null);

  const save = async () => {
    setSaving(true);
    const { error } = await adminSupabase.from('profiles').update({ username, is_banned: isBanned }).eq('id', user.id);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'User saved' }); onSaved(); }
    setSaving(false);
  };

  const grantPlan = async () => {
    if (!grantPlanId) return;
    setGranting(true);
    const plan = plans.find(p => p.id === grantPlanId);
    const isLifetime = !plan?.duration_days || plan?.billing_interval === 'lifetime';
    const expires = isLifetime ? null : new Date(Date.now() + plan.duration_days * 86400000).toISOString();

    // 1. Insert user_plans row
    const { error: planError } = await adminSupabase.from('user_plans').insert({
      user_id: user.id, plan_id: grantPlanId, expires_at: expires,
    });
    if (planError) {
      toast({ variant: 'destructive', title: 'Error granting plan', description: planError.message });
      setGranting(false); return;
    }

    // 2. Auto-generate and link a license key for this plan
    const keyCode = generateKeyCode();
    const { error: keyError } = await adminSupabase.from('license_keys').insert({
      key_code:   keyCode,
      user_id:    user.id,
      plan_id:    grantPlanId,
      status:     'active',
      expires_at: expires,
    });
    if (keyError) {
      // Plan was granted but key failed — warn but don't block
      toast({ variant: 'destructive', title: 'Key generation failed', description: keyError.message });
    } else {
      toast({ title: 'Plan granted', description: 'Key ' + keyCode + ' generated and linked.' });
    }

    onRefresh(user.id); setGrantPlanId('');
    setGranting(false);
  };

  const revokePlan = async (planRowId) => {
    setRevokingId(planRowId);
    const { error } = await adminSupabase.from('user_plans').delete().eq('id', planRowId);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'Plan revoked' }); onRefresh(user.id); }
    setRevokingId(null);
  };

  const removeKey = async (keyId) => {
    setRemovingKeyId(keyId);
    const { error } = await adminSupabase.from('license_keys').update({ user_id: null, status: 'inactive' }).eq('id', keyId);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'Key unlinked' }); onRefresh(user.id); }
    setRemovingKeyId(null);
  };

  const resetHwid = async (keyId) => {
    setResettingHwidId(keyId);
    const { error } = await adminSupabase.from('license_keys').update({ hwid: null, hwid_device_count: 0, hwid_locked: false }).eq('id', keyId);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'HWID reset' }); onRefresh(user.id); }
    setResettingHwidId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 overflow-y-auto pt-8 pb-8 px-4">
      <div className="bg-[#0d0d1a] border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div><h2 className="text-lg font-bold text-white">Edit User</h2><p className="text-xs text-slate-500 font-mono">{user.id}</p></div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Profile</h3>
            <div><label className="text-xs text-slate-500 mb-1 block">Username</label>
              <Input value={username} onChange={e => setUsername(e.target.value)} className="bg-[#060610] border-slate-700 text-white" /></div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isBanned} onChange={e => setIsBanned(e.target.checked)} className="w-4 h-4 accent-red-500" />
                <span className="text-sm text-slate-300">Banned</span>
              </label>
              {isBanned && <Badge className="bg-red-900/50 text-red-400 border-red-800">Banned</Badge>}
            </div>
            <Button onClick={save} disabled={saving} className="bg-cyan-700 hover:bg-cyan-600 text-white">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save Changes
            </Button>
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Plans</h3>
            {!(user.plans||[]).length ? <p className="text-xs text-slate-600">No active plans.</p> : (
              <div className="space-y-2">{user.plans.map(up => (
                <div key={up.id} className="flex items-center justify-between bg-[#060610] rounded-lg px-3 py-2 border border-slate-800">
                  <div>
                    <span className={cn('text-xs px-2 py-0.5 rounded font-medium capitalize mr-2', TIER_COLORS[up.plans?.tier||'free'])}>{up.plans?.tier}</span>
                    <span className="text-sm text-white">{up.plans?.name}</span>
                    {up.expires_at && <span className="text-xs text-slate-500 ml-2">Exp {new Date(up.expires_at).toLocaleDateString()}</span>}
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-500 h-7 px-2" disabled={revokingId===up.id} onClick={() => revokePlan(up.id)}>
                    {revokingId===up.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </Button>
                </div>
              ))}</div>
            )}
            <div className="flex gap-2">
              <select value={grantPlanId} onChange={e => setGrantPlanId(e.target.value)} className="flex-1 h-9 px-3 rounded-md border border-slate-700 bg-[#060610] text-white text-sm">
                <option value="">Grant a plan...</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price})</option>)}
              </select>
              <Button onClick={grantPlan} disabled={granting||!grantPlanId} className="bg-green-800 hover:bg-green-700 text-white whitespace-nowrap">
                {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Grant Plan'}
              </Button>
            </div>
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">License Keys</h3>
            {!(user.keys||[]).length ? <p className="text-xs text-slate-600">No keys linked.</p> : (
              <div className="space-y-2">{user.keys.map(k => {
                const sm = KEY_STATUS_META[k.status]||KEY_STATUS_META.inactive;
                return (
                  <div key={k.id} className="bg-[#060610] rounded-lg p-3 border border-slate-800">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono text-xs text-white">{k.key_code}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', sm.bg, sm.color)}>{sm.label}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span><Monitor className="w-3 h-3 inline mr-1" />{k.hwid_device_count||0}/{k.max_devices||5} devices</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-slate-700 text-slate-400 hover:text-white" disabled={resettingHwidId===k.id} onClick={() => resetHwid(k.id)}>
                        {resettingHwidId===k.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}Reset HWID
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-900 text-red-400 hover:bg-red-950" disabled={removingKeyId===k.id} onClick={() => removeKey(k.id)}>
                        {removingKeyId===k.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <X className="w-3 h-3 mr-1" />}Remove
                      </Button>
                    </div>
                  </div>
                );
              })}</div>
            )}
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">PayPal History</h3>
            {!(user.paypal||[]).length ? <p className="text-xs text-slate-600">No PayPal orders.</p> : (
              <div className="space-y-2">{user.paypal.map(o => (
                <div key={o.id} className="flex items-center justify-between bg-[#060610] rounded-lg px-3 py-2 border border-slate-800 text-xs">
                  <div><span className="text-white font-medium">{o.plans?.name||'Unknown'}</span><span className="text-slate-500 ml-2">{o.payer_email}</span></div>
                  <span className="text-green-400 font-bold">${o.amount?.toFixed(2)}</span>
                </div>
              ))}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Plan Edit Modal ───────────────────────────────────────────────────────────
function PlanEditModal({ plan, onClose, onSaved, toast }) {
  const isNew = !plan?.id;
  const [form, setForm] = useState({
    name: plan?.name||'', tier: plan?.tier||'basic', billing_interval: plan?.billing_interval||'monthly',
    price: plan?.price??0, duration_days: plan?.duration_days??'', features: plan?.features||[],
    sort_order: plan?.sort_order??0, is_active: plan?.is_active??true,
  });
  const [featureInput, setFeatureInput] = useState('');
  const [saving, setSaving] = useState(false);
  const setField = (k, v) => setForm(f => ({...f, [k]: v}));
  const addFeature = () => { if (featureInput.trim()) { setField('features', [...form.features, featureInput.trim()]); setFeatureInput(''); }};
  const removeFeature = (i) => setField('features', form.features.filter((_,idx) => idx!==i));

  const save = async () => {
    setSaving(true);
    const data = {...form, duration_days: form.duration_days ? parseInt(form.duration_days) : null};
    const { error } = isNew
      ? await adminSupabase.from('plans').insert(data)
      : await adminSupabase.from('plans').update(data).eq('id', plan.id);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: isNew ? 'Plan created' : 'Plan saved' }); onSaved(); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 overflow-y-auto pt-8 pb-8 px-4">
      <div className="bg-[#0d0d1a] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">{isNew ? 'New Plan' : 'Edit Plan'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Plan Name</label>
              <Input value={form.name} onChange={e => setField('name', e.target.value)} className="bg-[#060610] border-slate-700 text-white" /></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Tier</label>
              <select value={form.tier} onChange={e => setField('tier', e.target.value)} className="w-full h-9 px-3 rounded-md border border-slate-700 bg-[#060610] text-white text-sm">
                {TIERS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Billing Interval</label>
              <select value={form.billing_interval} onChange={e => setField('billing_interval', e.target.value)} className="w-full h-9 px-3 rounded-md border border-slate-700 bg-[#060610] text-white text-sm">
                {INTERVALS.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase()+i.slice(1)}</option>)}
              </select></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Price ($)</label>
              <Input type="number" step="0.01" value={form.price} onChange={e => setField('price', parseFloat(e.target.value)||0)} className="bg-[#060610] border-slate-700 text-white" /></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Duration (days, blank=lifetime)</label>
              <Input type="number" value={form.duration_days} onChange={e => setField('duration_days', e.target.value)} placeholder="e.g. 30" className="bg-[#060610] border-slate-700 text-white" /></div>
            <div className="flex items-center gap-2 col-span-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} className="w-4 h-4 accent-cyan-500" />
              <span className="text-sm text-slate-300">Active</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Features</label>
            <div className="space-y-1 mb-2">{form.features.map((f,i) => (
              <div key={i} className="flex items-center justify-between bg-[#060610] rounded px-3 py-1.5 border border-slate-800 text-sm">
                <span className="text-slate-300">{f}</span>
                <button onClick={() => removeFeature(i)} className="text-red-500 hover:text-red-400 ml-2"><X className="w-3 h-3" /></button>
              </div>
            ))}</div>
            <div className="flex gap-2">
              <Input value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => e.key==='Enter' && addFeature()} placeholder="Add feature..." className="bg-[#060610] border-slate-700 text-white" />
              <Button onClick={addFeature} size="sm" variant="outline" className="border-slate-700 text-slate-400 hover:text-white"><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
          <Button onClick={save} disabled={saving} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}{isNew ? 'Create Plan' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Panel ──────────────────────────────────────────────────────────
const AdminPanel = () => {
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats]           = useState({ users:0, activeKeys:0, totalKeys:0, activePlans:0, revenue:0 });
  const [users, setUsers]           = useState([]);
  const [keys, setKeys]             = useState([]);
  const [plans, setPlans]           = useState([]);
  const [paypalOrders, setPaypal]   = useState([]);
  const [toolBans, setToolBans]     = useState([]);
  const [downloads, setDownloads]   = useState([]);
  const [loadingDownloads, setLoadingDownloads] = useState(false);
  const [dlModal, setDlModal]       = useState(null);  // null | 'new' | download_obj
  const [dlSaving, setDlSaving]     = useState(false);
  const [dlForm, setDlForm]         = useState({ name:'', description:'', version:'v1.0.0', tier:'basic', github_repo:'', is_github_private:true, is_active:true });
  const [editingUser, setEditingUser]     = useState(null);
  const [loadingUsers, setLoadingUsers]   = useState(false);
  const [loadingKeys, setLoadingKeys]     = useState(false);
  const [loadingPaypal, setLoadingPaypal] = useState(false);
  const [loadingBans, setLoadingBans]     = useState(false);
  const [loadingUserDetail, setLoadingUserDetail] = useState(null);
  const [expandedKey, setExpandedKey]     = useState(null);
  const [resettingHwid, setResettingHwid] = useState(null);
  const [generating, setGenerating]       = useState(false);
  const [genCount, setGenCount]           = useState(1);
  const [genPlanId, setGenPlanId]         = useState('');
  const [keySearch, setKeySearch]         = useState('');
  const [selectedKeys,   setSelectedKeys]   = useState([]);
  const [bulkTimeOpen,   setBulkTimeOpen]   = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [userSearch, setUserSearch]       = useState('');
  const [paypalSearch, setPaypalSearch]   = useState('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan]     = useState(null);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const [banUserId, setBanUserId]   = useState('');
  const [banReason, setBanReason]   = useState('');
  const [banProof, setBanProof]     = useState('');
  const [banNotes, setBanNotes]     = useState('');
  const [submittingBan, setSubmittingBan] = useState(false);
  const [unbanningId, setUnbanningId]     = useState(null);

  useEffect(() => { if (!loading && (!user || !isAdmin)) navigate('/dashboard'); }, [loading, user, isAdmin, navigate]);

  // ── Direct Supabase queries (no API routes) ──────────────────────────────
  const loadStats = useCallback(async () => {
    const [{ count: userCount }, { count: totalKeys }, { count: activeKeys }, { count: activePlans }, { data: paypalData }] = await Promise.all([
      adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
      adminSupabase.from('license_keys').select('*', { count: 'exact', head: true }),
      adminSupabase.from('license_keys').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      adminSupabase.from('user_plans').select('*', { count: 'exact', head: true }).gte('expires_at', new Date().toISOString()),
      adminSupabase.from('paypal_orders').select('amount').eq('status', 'completed'),
    ]);
    const revenue = (paypalData||[]).reduce((s, o) => s + (o.amount||0), 0);
    setStats({ users: userCount||0, totalKeys: totalKeys||0, activeKeys: activeKeys||0, activePlans: activePlans||0, revenue });
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data } = await adminSupabase.from('profiles').select('id, username, avatar_url, is_banned, created_at').order('created_at', { ascending: false }).limit(200);
    setUsers(data||[]); setLoadingUsers(false);
  }, []);

  const loadKeys = useCallback(async () => {
    setLoadingKeys(true);
    const { data } = await adminSupabase.from('license_keys').select('*').order('created_at', { ascending: false }).limit(500);
    setKeys(data||[]); setLoadingKeys(false);
  }, []);

  const loadPlans = useCallback(async () => {
    const { data } = await adminSupabase.from('plans').select('*').order('sort_order');
    setPlans(data||[]);
  }, []);

  const loadPaypal = useCallback(async () => {
    setLoadingPaypal(true);
    const { data } = await adminSupabase.from('paypal_orders').select('*, plans(name)').order('created_at', { ascending: false }).limit(500);
    setPaypal(data||[]); setLoadingPaypal(false);
  }, []);

  const loadDownloads = useCallback(async () => {
    setLoadingDownloads(true);
    const { data } = await adminSupabase.from('downloads').select('*').order('sort_order', { ascending: true });
    setDownloads(data||[]); setLoadingDownloads(false);
  }, []);

  const saveDownload = async () => {
    setDlSaving(true);
    if (dlModal === 'new') {
      const { error } = await adminSupabase.from('downloads').insert([{
        ...dlForm, sort_order: downloads.length + 1,
        last_updated: new Date().toISOString().split('T')[0],
      }]);
      if (error) { toast({ variant:'destructive', title:'Error', description: error.message }); }
      else { toast({ title:'Download added' }); loadDownloads(); setDlModal(null); }
    } else {
      const { error } = await adminSupabase.from('downloads').update({
        ...dlForm, last_updated: new Date().toISOString().split('T')[0],
      }).eq('id', dlModal.id);
      if (error) { toast({ variant:'destructive', title:'Error', description: error.message }); }
      else { toast({ title:'Download saved' }); loadDownloads(); setDlModal(null); }
    }
    setDlSaving(false);
  };

  const deleteDownload = async (id) => {
    const { error } = await adminSupabase.from('downloads').delete().eq('id', id);
    if (error) toast({ variant:'destructive', title:'Error', description: error.message });
    else { toast({ title:'Deleted' }); setDownloads(prev => prev.filter(d => d.id !== id)); }
  };

  const openDlModal = (item) => {
    if (item === 'new') {
      setDlForm({ name:'', description:'', version:'v1.0.0', tier:'basic', github_repo:'', is_github_private:true, is_active:true });
    } else {
      setDlForm({ name: item.name, description: item.description||'', version: item.version||'v1.0.0',
        tier: item.tier||'basic', github_repo: item.github_repo||'', is_github_private: item.is_github_private??true, is_active: item.is_active??true });
    }
    setDlModal(item);
  };

  const loadBans = useCallback(async () => {
    setLoadingBans(true);
    const { data } = await adminSupabase.from('tool_bans').select('*').eq('is_active', true).order('banned_at', { ascending: false });
    setToolBans(data||[]); setLoadingBans(false);
  }, []);

  useEffect(() => { if (isAdmin) { loadStats(); loadPlans(); } }, [isAdmin, loadStats, loadPlans]);

  const openUserEdit = async (userId) => {
    setLoadingUserDetail(userId);
    const [{ data: profile }, { data: userPlans }, { data: userPaypal }, { data: userKeys }] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', userId).single(),
      adminSupabase.from('user_plans').select('id, plan_id, expires_at, plans(name, tier)').eq('user_id', userId),
      adminSupabase.from('paypal_orders').select('*, plans(name)').eq('user_id', userId).order('created_at', { ascending: false }),
      adminSupabase.from('license_keys').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);
    if (profile) setEditingUser({ ...profile, plans: userPlans||[], keys: userKeys||[], paypal: userPaypal||[] });
    setLoadingUserDetail(null);
  };

  const generateKeys = async () => {
    setGenerating(true);
    const newKeys = Array.from({length: Math.min(genCount,50)}, () => ({ key_code: generateKeyCode(), status: 'inactive', plan_id: genPlanId||null }));
    const { error } = await adminSupabase.from('license_keys').insert(newKeys);
    if (!error) { toast({ title: `${newKeys.length} key(s) generated` }); loadStats(); if (keys.length > 0) loadKeys(); }
    else toast({ variant: 'destructive', title: 'Error', description: error.message });
    setGenerating(false);
  };

  const updateKeyStatus = async (id, status) => {
    const { error } = await adminSupabase.from('license_keys').update({ status }).eq('id', id);
    if (!error) { setKeys(prev => prev.map(k => k.id===id ? {...k,status} : k)); toast({ title: 'Status updated' }); }
  };

  const resetKeyHwid = async (keyId) => {
    setResettingHwid(keyId);
    const { error } = await adminSupabase.from('license_keys').update({ hwid: null, hwid_device_count: 0, hwid_locked: false }).eq('id', keyId);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'HWID reset' }); loadKeys(); }
    setResettingHwid(null);
  };

  const deletePlan = async (id) => {
    if (!confirm('Delete this plan?')) return;
    setDeletingPlanId(id);
    const { error } = await adminSupabase.from('plans').delete().eq('id', id);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'Plan deleted' }); loadPlans(); }
    setDeletingPlanId(null);
  };

  const submitBan = async () => {
    if (!banUserId.trim() || !banReason.trim()) return;
    setSubmittingBan(true);
    const { error } = await adminSupabase.from('tool_bans').insert({ user_id: banUserId.trim(), reason: banReason.trim(), proof: banProof||null, notes: banNotes||null, is_active: true, tool: 'auction' });
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'User banned from Tools' }); setBanUserId(''); setBanReason(''); setBanProof(''); setBanNotes(''); loadBans(); }
    setSubmittingBan(false);
  };

  const unban = async (banId) => {
    setUnbanningId(banId);
    const { error } = await adminSupabase.from('tool_bans').update({ is_active: false }).eq('id', banId);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'User unbanned' }); loadBans(); }
    setUnbanningId(null);
  };

  const filteredKeys  = keys.filter(k => !keySearch || k.key_code.toLowerCase().includes(keySearch.toLowerCase()) || k.status.includes(keySearch.toLowerCase()));
  const filteredUsers = users.filter(u => !userSearch || (u.username||'').toLowerCase().includes(userSearch.toLowerCase()) || u.id.includes(userSearch));
  const filteredPaypal = paypalOrders.filter(o => !paypalSearch || (o.payer_email||'').toLowerCase().includes(paypalSearch.toLowerCase()) || (o.order_id||'').toLowerCase().includes(paypalSearch.toLowerCase()));

  if (loading || !isAdmin) return <div className="min-h-screen pt-24 flex items-center justify-center"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>;

  return (
    <div className="min-h-screen pt-24 px-4 bg-[#08080f] text-white pb-20">
      {editingUser && <UserEditModal user={editingUser} plans={plans} onClose={() => setEditingUser(null)} onSaved={() => { loadUsers(); loadStats(); setEditingUser(null); }} onRefresh={openUserEdit} toast={toast} />}
      {showPlanModal && <PlanEditModal plan={editingPlan} onClose={() => setShowPlanModal(false)} onSaved={() => { loadPlans(); setShowPlanModal(false); }} toast={toast} />}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-cyan-950/50 rounded-lg border border-cyan-900/50"><Shield className="w-6 h-6 text-cyan-400" /></div>
          <div><h1 className="text-2xl font-bold text-white">Admin Panel</h1><p className="text-slate-500 text-sm">StreamVibe management console</p></div>
          <Badge className="ml-2 bg-cyan-900/50 text-cyan-400 border-cyan-800">Admin</Badge>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label:'Users',        value: stats.users,                    icon: Users,       color:'text-blue-400',    bg:'bg-blue-950/30 border-blue-900/50' },
            { label:'Active Keys',  value: stats.activeKeys,               icon: CheckCircle, color:'text-green-400',   bg:'bg-green-950/30 border-green-900/50' },
            { label:'Total Keys',   value: stats.totalKeys,                icon: Key,         color:'text-purple-400',  bg:'bg-purple-950/30 border-purple-900/50' },
            { label:'Active Plans', value: stats.activePlans,              icon: CreditCard,  color:'text-cyan-400',    bg:'bg-cyan-950/30 border-cyan-900/50' },
            { label:'Revenue',      value:`$${stats.revenue.toFixed(2)}`,  icon: DollarSign,  color:'text-emerald-400', bg:'bg-emerald-950/30 border-emerald-900/50' },
          ].map((s,i) => (
            <Card key={i} className={cn('border', s.bg)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="text-xs text-slate-500 mb-1">{s.label}</p><p className={cn('text-2xl font-extrabold', s.color)}>{s.value}</p></div>
                <s.icon className={cn('w-8 h-8 opacity-30', s.color)} />
              </CardContent>
            </Card>
          ))}
        </div>
        <Tabs defaultValue="users">
          <TabsList className="bg-[#12121e] border border-slate-800 p-1 mb-6 h-auto gap-1 flex-wrap">
            <TabsTrigger value="users"    className="data-[state=active]:bg-blue-900/50 data-[state=active]:text-blue-300"    onClick={() => { if (!users.length) loadUsers(); }}><Users className="w-4 h-4 mr-2" />Users</TabsTrigger>
            <TabsTrigger value="keys"     className="data-[state=active]:bg-purple-900/50 data-[state=active]:text-purple-300" onClick={() => { if (!keys.length) loadKeys(); }}><Key className="w-4 h-4 mr-2" />License Keys</TabsTrigger>
            <TabsTrigger value="plans"    className="data-[state=active]:bg-yellow-900/50 data-[state=active]:text-yellow-300"><Star className="w-4 h-4 mr-2" />Plans</TabsTrigger>
            <TabsTrigger value="downloads" className="data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300" onClick={() => { if (!downloads.length) loadDownloads(); }}><Download className="w-4 h-4 mr-2" />Downloads</TabsTrigger>
            <TabsTrigger value="paypal"   className="data-[state=active]:bg-emerald-900/50 data-[state=active]:text-emerald-300" onClick={() => { if (!paypalOrders.length) loadPaypal(); }}><CreditCard className="w-4 h-4 mr-2" />PayPal</TabsTrigger>
            <TabsTrigger value="toolbans" className="data-[state=active]:bg-red-900/50 data-[state=active]:text-red-300"       onClick={() => { if (!toolBans.length) loadBans(); }}><Ban className="w-4 h-4 mr-2" />Tool Bans</TabsTrigger>
            <TabsTrigger value="forum" className="data-[state=active]:bg-purple-900/50 data-[state=active]:text-purple-300"><MessageSquare className="w-4 h-4 mr-2" />Forum</TabsTrigger>
          </TabsList>

          {/* USERS */}
          <TabsContent value="users">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><CardTitle className="text-white">Users</CardTitle><CardDescription className="text-slate-500">{stats.users} registered</CardDescription></div>
                <div className="flex gap-2">
                  <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><Input placeholder="Search..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 bg-[#0d0d1a] border-slate-700 text-white w-48" /></div>
                  <Button size="sm" variant="outline" onClick={loadUsers} disabled={loadingUsers} className="border-slate-700 text-slate-400 hover:text-white">{loadingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-blue-400 animate-spin" /></div>
                : users.length===0 ? <p className="text-center text-slate-500 py-12">Click Refresh to load users.</p>
                : <div className="overflow-x-auto"><table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-800 text-slate-500 text-xs">
                      <th className="text-left pb-3 font-medium">User</th>
                      <th className="text-left pb-3 font-medium hidden md:table-cell">Joined</th>
                      <th className="text-left pb-3 font-medium">Status</th>
                      <th className="text-right pb-3 font-medium">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-800/20">
                          <td className="py-3 pr-4"><span className="text-white font-medium">{u.username||<span className="text-slate-500 italic text-xs">unnamed</span>}</span><p className="font-mono text-xs text-slate-600">{u.id.slice(0,14)}…</p></td>
                          <td className="py-3 pr-4 hidden md:table-cell text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="py-3 pr-4">{u.is_banned ? <Badge className="bg-red-900/50 text-red-400 border-red-800 text-xs">Banned</Badge> : <Badge className="bg-green-900/50 text-green-400 border-green-800 text-xs">Active</Badge>}</td>
                          <td className="py-3 text-right">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400 hover:text-white" disabled={loadingUserDetail===u.id} onClick={() => openUserEdit(u.id)}>
                              {loadingUserDetail===u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Edit2 className="w-3 h-3 mr-1" />}Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-slate-600 mt-4 text-right">Showing {filteredUsers.length} of {users.length}</p>
                </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* KEYS */}
          <TabsContent value="keys" className="space-y-6">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Key className="w-5 h-5 text-purple-400" />Generate Keys</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-end">
                  <div><label className="text-xs text-slate-400 mb-1 block">Quantity (max 50)</label><Input type="number" min={1} max={50} value={genCount} onChange={e => setGenCount(Math.min(50,Math.max(1,parseInt(e.target.value)||1)))} className="w-24 bg-[#0d0d1a] border-slate-700 text-white" /></div>
                  <div className="flex-1 min-w-48"><label className="text-xs text-slate-400 mb-1 block">Assign to Plan (optional)</label>
                    <select value={genPlanId} onChange={e => setGenPlanId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-slate-700 bg-[#0d0d1a] text-white text-sm">
                      <option value="">No plan (unassigned)</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price})</option>)}
                    </select>
                  </div>
                  <Button onClick={generateKeys} disabled={generating} className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold min-w-36">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}Generate {genCount>1?`${genCount} Keys`:'Key'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-white">All License Keys</CardTitle>
                  {selectedKeys.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-purple-400 font-semibold">{selectedKeys.length} selected</span>
                      <Button size="sm" className="h-7 text-xs bg-green-900/40 border border-green-800 text-green-400 hover:bg-green-900" onClick={() => setBulkTimeOpen(true)}><Clock className="w-3 h-3 mr-1" />Add Time</Button>
                      <Button size="sm" className="h-7 text-xs bg-blue-900/40 border border-blue-800 text-blue-400 hover:bg-blue-900" onClick={() => setBulkStatusOpen(true)}><Edit2 className="w-3 h-3 mr-1" />Change Status</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500" onClick={() => setSelectedKeys([])}><X className="w-3 h-3 mr-1" />Clear</Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><Input placeholder="Search..." value={keySearch} onChange={e => setKeySearch(e.target.value)} className="pl-9 bg-[#0d0d1a] border-slate-700 text-white w-48" /></div>
                  <Button size="sm" variant="outline" onClick={loadKeys} disabled={loadingKeys} className="border-slate-700 text-slate-400 hover:text-white">{loadingKeys ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingKeys ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
                : keys.length===0 ? <div className="text-center py-12"><p className="text-slate-500">Click Refresh to load keys.</p><Button variant="outline" className="mt-4 border-slate-700 text-slate-400" onClick={loadKeys}>Load Keys</Button></div>
                : <div className="space-y-2">
                    {/* Select all */}
                    <div className="flex items-center gap-2 px-2 pb-1 border-b border-slate-800 mb-1">
                      <input type="checkbox"
                        checked={filteredKeys.length > 0 && selectedKeys.length === filteredKeys.length}
                        onChange={e => setSelectedKeys(e.target.checked ? filteredKeys.map(k=>k.id) : [])}
                        className="w-4 h-4 rounded accent-purple-500"
                      />
                      <span className="text-xs text-slate-500">Select all ({filteredKeys.length})</span>
                    </div>
                    {filteredKeys.map(k => {
                      const sm = KEY_STATUS_META[k.status]||KEY_STATUS_META.inactive;
                      const expanded = expandedKey===k.id;
                      const isSelected = selectedKeys.includes(k.id);
                      return (
                        <div key={k.id} className={`border rounded-lg overflow-hidden ${isSelected ? 'border-purple-700 bg-purple-950/10' : 'border-slate-800'}`}>
                          <div className="flex items-center gap-3 px-4 py-3 bg-[#0d0d1a] hover:bg-[#10101c] cursor-pointer" onClick={() => setExpandedKey(expanded?null:k.id)}>
                            <input type="checkbox" className="w-4 h-4 rounded accent-purple-500 shrink-0"
                              checked={isSelected}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setSelectedKeys(prev => e.target.checked ? [...prev, k.id] : prev.filter(id => id !== k.id))}
                            />
                            <span className="font-mono text-xs text-white flex-1">{k.key_code}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline', sm.bg, sm.color)}>{sm.label}</span>
                            <span className="text-xs text-slate-600 hidden md:inline"><Monitor className="w-3 h-3 inline mr-1" />{k.hwid_device_count||0}/{k.max_devices||5}</span>
                            {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                          </div>
                          {expanded && (
                            <div className="px-4 py-3 bg-[#08080f] border-t border-slate-800 space-y-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div><span className="text-slate-500">Devices</span><p className="text-white">{k.hwid_device_count||0}/{k.max_devices||5}</p></div>
                                <div><span className="text-slate-500">IP</span><p className="text-white font-mono">{k.ip_address||'N/A'}</p></div>
                                <div><span className="text-slate-500">Expires</span><p className="text-white">{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Never'}</p></div>
                                <div><span className="text-slate-500">Redeemed</span><p className="text-white">{k.redeemed_at ? new Date(k.redeemed_at).toLocaleDateString() : 'No'}</p></div>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white border border-slate-700" onClick={() => { navigator.clipboard.writeText(k.key_code); toast({title:'Copied'}); }}><Copy className="w-3 h-3 mr-1" />Copy</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-orange-400 border border-orange-900" disabled={resettingHwid===k.id} onClick={() => resetKeyHwid(k.id)}>{resettingHwid===k.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}Reset HWID</Button>
                                {k.status!=='banned' && <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 border border-red-900" onClick={() => updateKeyStatus(k.id,'banned')}><Ban className="w-3 h-3 mr-1" />Ban</Button>}
                                {k.status==='banned' && <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400 border border-green-900" onClick={() => updateKeyStatus(k.id,'inactive')}><CheckCircle className="w-3 h-3 mr-1" />Unban</Button>}
                                {k.status==='inactive' && <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400 border border-green-900" onClick={() => updateKeyStatus(k.id,'active')}><CheckCircle className="w-3 h-3 mr-1" />Activate</Button>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <p className="text-xs text-slate-600 text-right pt-2">Showing {filteredKeys.length} of {keys.length}</p>
                  </div>}
              </CardContent>
            </Card>

            {/* Bulk Dialogs */}
            <BulkAddTimeDialog
              open={bulkTimeOpen}
              onOpenChange={setBulkTimeOpen}
              keyIds={selectedKeys}
              onSuccess={() => { setSelectedKeys([]); loadKeys(); }}
            />
            <BulkStatusDialog
              open={bulkStatusOpen}
              onOpenChange={setBulkStatusOpen}
              keyIds={selectedKeys}
              onSuccess={() => { setSelectedKeys([]); loadKeys(); }}
            />
          </TabsContent>

          {/* PLANS */}
          <TabsContent value="plans">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle className="text-white flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" />Plans</CardTitle><CardDescription className="text-slate-400">Manage subscription plans</CardDescription></div>
                <Button onClick={() => { setEditingPlan(null); setShowPlanModal(true); }} className="bg-cyan-700 hover:bg-cyan-600 text-white"><Plus className="w-4 h-4 mr-2" />New Plan</Button>
              </CardHeader>
              <CardContent>
                {plans.length===0 ? <p className="text-center text-slate-500 py-8">No plans yet.</p>
                : <div className="space-y-2">{plans.map(p => (
                    <div key={p.id} className="bg-[#0d0d1a] rounded-xl border border-slate-800 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={cn('text-xs px-2 py-0.5 rounded font-medium capitalize shrink-0', TIER_COLORS[p.tier]||TIER_COLORS.free)}>{p.tier}</span>
                          <div className="min-w-0"><p className="text-white font-semibold text-sm truncate">{p.name}</p><p className="text-xs text-slate-500">${p.price} / {p.billing_interval} / {p.duration_days?p.duration_days+' days':'lifetime'}</p></div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {!p.is_active && <Badge className="bg-slate-800 text-slate-500 text-xs">Inactive</Badge>}
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white" onClick={() => { setEditingPlan(p); setShowPlanModal(true); }}><Edit2 className="w-3 h-3 mr-1" />Edit</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-400" disabled={deletingPlanId===p.id} onClick={() => deletePlan(p.id)}>{deletingPlanId===p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}</Button>
                        </div>
                      </div>
                      {p.features?.length>0 && <div className="px-4 pb-3 flex flex-wrap gap-1.5">{p.features.map((f,i) => <span key={i} className="text-[11px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded-full">{f}</span>)}</div>}
                    </div>
                  ))}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DOWNLOADS */}
          <TabsContent value="downloads">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2"><Download className="w-5 h-5 text-cyan-400" />Downloads</CardTitle>
                  <CardDescription className="text-slate-400">Manage downloadable software</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={loadDownloads} disabled={loadingDownloads} className="border-slate-700 text-slate-400 hover:text-white">
                    {loadingDownloads ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  <Button onClick={() => openDlModal('new')} className="bg-cyan-700 hover:bg-cyan-600 text-white"><Plus className="w-4 h-4 mr-2" />Add Download</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDownloads ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
                : downloads.length === 0 ? <p className="text-center text-slate-500 py-8">No downloads yet. Click Add Download.</p>
                : <div className="space-y-3">
                    {downloads.map(dl => (
                      <div key={dl.id} className="bg-[#0d0d1a] rounded-xl border border-slate-800 flex items-center justify-between px-4 py-3 gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                            <Download className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-semibold text-sm">{dl.name}</p>
                              <span className="text-xs text-slate-500">{dl.version}</span>
                              <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${TIER_COLORS[dl.tier]||TIER_COLORS.free}`}>{dl.tier}</span>
                              {!dl.is_active && <Badge className="bg-slate-800 text-slate-500 text-xs">Inactive</Badge>}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{dl.description}</p>
                            {dl.github_repo && (
                              <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                                <Github className="w-3 h-3" />{dl.github_repo}
                                {dl.last_updated && <span className="text-slate-700">· Updated {dl.last_updated}</span>}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400 hover:text-white" onClick={() => openDlModal(dl)}><Edit2 className="w-3 h-3 mr-1" />Edit</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-400" onClick={() => deleteDownload(dl.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>}
              </CardContent>
            </Card>

            {/* Download Edit/Add Modal */}
            {dlModal !== null && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-[#12121e] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">{dlModal === 'new' ? 'Add Download' : 'Edit Download'}</h2>
                    <button onClick={() => setDlModal(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-3">
                    <div><label className="text-xs text-slate-500 mb-1 block">Name *</label><Input value={dlForm.name} onChange={e => setDlForm(p=>({...p,name:e.target.value}))} placeholder="StreamVibe Desktop" className="bg-[#060610] border-slate-700 text-white" /></div>
                    <div><label className="text-xs text-slate-500 mb-1 block">Description</label><Input value={dlForm.description} onChange={e => setDlForm(p=>({...p,description:e.target.value}))} placeholder="Windows desktop app for TikTok LIVE" className="bg-[#060610] border-slate-700 text-white" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs text-slate-500 mb-1 block">Version</label><Input value={dlForm.version} onChange={e => setDlForm(p=>({...p,version:e.target.value}))} placeholder="v1.0.0" className="bg-[#060610] border-slate-700 text-white" /></div>
                      <div><label className="text-xs text-slate-500 mb-1 block">Required Tier</label>
                        <select value={dlForm.tier} onChange={e => setDlForm(p=>({...p,tier:e.target.value}))} className="w-full bg-[#060610] border border-slate-700 text-white rounded-md px-3 py-2 text-sm">
                          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div><label className="text-xs text-slate-500 mb-1 block">GitHub Repo URL</label><Input value={dlForm.github_repo} onChange={e => setDlForm(p=>({...p,github_repo:e.target.value}))} placeholder="https://github.com/org/repo/releases/latest" className="bg-[#060610] border-slate-700 text-white font-mono text-xs" /></div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={dlForm.is_github_private} onChange={e => setDlForm(p=>({...p,is_github_private:e.target.checked}))} className="w-4 h-4 rounded" />
                        <span className="text-sm text-slate-400">Private repo (uses token)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer ml-auto">
                        <input type="checkbox" checked={dlForm.is_active} onChange={e => setDlForm(p=>({...p,is_active:e.target.checked}))} className="w-4 h-4 rounded" />
                        <span className="text-sm text-slate-400">Active</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setDlModal(null)} className="flex-1 border-slate-700 text-slate-400">Cancel</Button>
                    <Button onClick={saveDownload} disabled={dlSaving||!dlForm.name.trim()} className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white">
                      {dlSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      {dlModal === 'new' ? 'Add' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>


          {/* PAYPAL */}
          <TabsContent value="paypal">
            <Card className="bg-[#12121e] border-slate-800">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div><CardTitle className="text-white">PayPal Transactions</CardTitle><CardDescription className="text-slate-500">Revenue: <span className="text-emerald-400 font-bold">${stats.revenue.toFixed(2)}</span></CardDescription></div>
                  <Button size="sm" variant="outline" onClick={loadPaypal} disabled={loadingPaypal} className="border-slate-700 text-slate-400 hover:text-white">{loadingPaypal ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Refresh</Button>
                </div>
                <div className="relative mt-4"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><Input placeholder="Search email, order ID..." value={paypalSearch} onChange={e => setPaypalSearch(e.target.value)} className="pl-9 bg-[#0d0d1a] border-slate-700 text-white" /></div>
              </CardHeader>
              <CardContent>
                {loadingPaypal ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>
                : filteredPaypal.length===0 ? <p className="text-center text-slate-500 py-12">{paypalOrders.length===0 ? 'Click Refresh to load orders.' : 'No results.'}</p>
                : <div className="overflow-x-auto"><table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-800 text-slate-500 text-xs">
                      <th className="text-left pb-3 font-medium">Order ID</th><th className="text-left pb-3 font-medium">Plan</th>
                      <th className="text-left pb-3 font-medium hidden md:table-cell">Payer</th>
                      <th className="text-left pb-3 font-medium">Amount</th><th className="text-left pb-3 font-medium">Status</th>
                      <th className="text-left pb-3 font-medium hidden lg:table-cell">Date</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredPaypal.map(o => (
                        <tr key={o.id} className="hover:bg-slate-800/20">
                          <td className="py-3 pr-4 font-mono text-xs text-slate-400">{o.order_id?.slice(0,12)}…</td>
                          <td className="py-3 pr-4 text-white text-xs">{o.plans?.name||'Unknown'}</td>
                          <td className="py-3 pr-4 hidden md:table-cell text-xs text-slate-400">{o.payer_email||'N/A'}</td>
                          <td className="py-3 pr-4 text-emerald-400 font-bold">${o.amount?.toFixed(2)}</td>
                          <td className="py-3 pr-4"><Badge className={o.status==='completed' ? 'bg-green-900/50 text-green-400 border-green-800 text-xs' : 'bg-slate-800 text-slate-400 text-xs'}>{o.status}</Badge></td>
                          <td className="py-3 hidden lg:table-cell text-slate-400 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TOOL BANS */}
          <TabsContent value="toolbans" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#12121e] border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2"><Ban className="w-5 h-5 text-red-400" />Ban User from Tools</CardTitle>
                  <CardDescription className="text-slate-400">Prevents access to auction tool. Account and plan remain intact.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div><label className="text-xs text-slate-500 mb-1 block">User ID *</label><Input value={banUserId} onChange={e => setBanUserId(e.target.value)} placeholder="Paste user UUID from Users tab" className="bg-[#060610] border-slate-700 text-white font-mono text-xs" /></div>
                  <div><label className="text-xs text-slate-500 mb-1 block">Reason *</label><Input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g. Scamming viewers" className="bg-[#060610] border-slate-700 text-white" /></div>
                  <div><label className="text-xs text-slate-500 mb-1 block">Proof (optional)</label><Input value={banProof} onChange={e => setBanProof(e.target.value)} placeholder="URL or description" className="bg-[#060610] border-slate-700 text-white" /></div>
                  <div><label className="text-xs text-slate-500 mb-1 block">Internal Notes</label><Input value={banNotes} onChange={e => setBanNotes(e.target.value)} placeholder="Optional internal notes" className="bg-[#060610] border-slate-700 text-white" /></div>
                  <Button onClick={submitBan} disabled={submittingBan||!banUserId.trim()||!banReason.trim()} className="w-full bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white">
                    {submittingBan ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}Ban User from Tools
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-[#12121e] border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" />Active Tool Bans</CardTitle>
                  <Button size="sm" variant="outline" onClick={loadBans} disabled={loadingBans} className="border-slate-700 text-slate-400 hover:text-white">{loadingBans ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</Button>
                </CardHeader>
                <CardContent>
                  {loadingBans ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-red-400" /></div>
                  : toolBans.length===0 ? <div className="text-center py-8 text-slate-500 text-sm">No active tool bans</div>
                  : <div className="space-y-3 max-h-[500px] overflow-y-auto">{toolBans.map(ban => (
                      <div key={ban.id} className="bg-[#0a0a14] border border-red-900/30 rounded-xl p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-xs text-slate-500 truncate">{ban.user_id}</div>
                            <div className="text-red-300 font-semibold text-sm mt-1">{ban.reason}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => unban(ban.id)} disabled={unbanningId===ban.id} className="border-green-900 text-green-400 hover:bg-green-950 shrink-0">
                            {unbanningId===ban.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3 mr-1" />}Unban
                          </Button>
                        </div>
                        {ban.notes && <div className="text-xs text-slate-600 italic">{ban.notes}</div>}
                        <div className="text-xs text-slate-700">{new Date(ban.banned_at).toLocaleString()}</div>
                      </div>
                    ))}</div>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FORUM ADMIN */}
          <TabsContent value="forum">
            <AdminForumSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
