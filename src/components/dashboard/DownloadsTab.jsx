import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Download, Loader2, Lock, CheckCircle, Clock } from 'lucide-react';

const TIER_ORDER = { free: 0, basic: 1, pro: 2, legend: 3 };
const TIER_COLORS = {
  free:   'text-slate-400 bg-slate-800',
  basic:  'text-blue-300 bg-blue-900/40',
  pro:    'text-purple-300 bg-purple-900/40',
  legend: 'text-yellow-300 bg-yellow-900/40',
};

// Proxy endpoint that streams GitHub release asset using stored token
const DOWNLOAD_PROXY = '/api/download-proxy';

export default function DownloadsTab() {
  const { user, userPlans } = useAuth();
  const [downloads, setDownloads]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('downloads')
        .select('id,name,description,version,tier,github_repo,is_github_private,last_updated,is_active,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setDownloads(data || []);
      setLoading(false);
    };
    load();
  }, []);

  // Determine highest tier the user has
  const userTierLevel = userPlans?.reduce((max, up) => {
    const lvl = TIER_ORDER[up.plans?.tier] ?? 0;
    return lvl > max ? lvl : max;
  }, 0) ?? 0;

  const canDownload = (tier) => {
    const required = TIER_ORDER[tier] ?? 0;
    return userTierLevel >= required;
  };

  const handleDownload = async (dl) => {
    if (!canDownload(dl.tier)) return;
    if (!dl.github_repo) return;
    setDownloading(dl.id);
    try {
      // Use the proxy endpoint to get a signed download URL
      const res = await fetch(`${DOWNLOAD_PROXY}?id=${dl.id}`, {
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      // Open in new tab — browser will start download
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed: ' + err.message);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Download className="w-6 h-6 text-cyan-400" />
        <div>
          <h2 className="text-xl font-bold text-white">Available Downloads</h2>
          <p className="text-slate-400 text-sm">Your plan unlocks the following software</p>
        </div>
      </div>

      {downloads.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No downloads available yet.</p>
      ) : (
        <div className="space-y-3">
          {downloads.map(dl => {
            const unlocked = canDownload(dl.tier);
            const isDownloading = downloading === dl.id;
            const hasFile = !!dl.github_repo;

            return (
              <div key={dl.id}
                className="bg-[#1a1a24] border border-slate-800 rounded-xl px-5 py-4 flex items-center gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-cyan-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{dl.name}</span>
                    <span className="text-slate-500 text-xs">{dl.version}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-0.5">{dl.description}</p>
                  {dl.last_updated && (
                    <p className="text-slate-600 text-xs mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />Updated {new Date(dl.last_updated).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}
                    </p>
                  )}
                </div>

                {/* Action */}
                <div className="shrink-0">
                  {!hasFile ? (
                    <span className="text-xs bg-slate-800 text-slate-500 px-3 py-1.5 rounded-lg">Coming Soon</span>
                  ) : !unlocked ? (
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs bg-slate-800/60 px-3 py-1.5 rounded-lg">
                      <Lock className="w-3.5 h-3.5" />
                      <span className="capitalize">{dl.tier}+ required</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDownload(dl)}
                      disabled={isDownloading}
                      className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
                      {isDownloading
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Downloading...</>
                        : <><Download className="w-4 h-4" />Download</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
