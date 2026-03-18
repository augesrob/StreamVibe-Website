import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuctionEngine } from '@/hooks/useAuctionEngine';
import { useTikTokConnector } from '@/hooks/useTikTokConnector';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import AuctionLeft   from '@/components/tools/AuctionLeft';
import AuctionCenter from '@/components/tools/AuctionCenter';
import AuctionRight  from '@/components/tools/AuctionRight';
import NewLeaderPop  from '@/components/tools/NewLeaderPop';

const AuctionTool = () => {
  const engine = useAuctionEngine();
  const { user } = useAuth();
  const [connError, setConnError] = useState(null);
  const [overlayToken, setOverlayToken] = useState(null);

  const tiktok = useTikTokConnector({
    onGift:  (user, coins) => engine.processBid(user, coins),
    onError: (msg)         => setConnError(msg),
  });

  // Fetch overlay token for per-user URL
  useEffect(() => {
    if (!user) return;
    const fetchToken = async () => {
      const { data: profile } = await supabase
        .from('profiles').select('overlay_token').eq('id', user.id).single();
      let token = profile?.overlay_token;
      if (!token) {
        token = crypto.randomUUID();
        await supabase.from('profiles').update({ overlay_token: token }).eq('id', user.id);
      }
      setOverlayToken(token);
    };
    fetchToken();
  }, [user]);

  // Sync state to localStorage + Supabase Realtime so /overlay can receive it
  useEffect(() => {
    try {
      localStorage.setItem('sv_auction_overlay_state', JSON.stringify({
        phase:      engine.phase,
        remaining:  engine.remaining,
        snipeDelay: engine.snipeDelay,
        leader:     engine.leader,
        minCoins:   engine.minCoins,
        theme:      engine.theme,
        bids:       engine.bids.slice(0, 20),
      }));
    } catch (_) {}
  }, [engine.phase, engine.remaining, engine.snipeDelay, engine.leader, engine.minCoins, engine.theme, engine.bids]);

  const overlayUrl = overlayToken
    ? `${window.location.origin}/overlay?token=${overlayToken}`
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] mt-16 bg-[#0a0b14] text-white overflow-hidden">
      <Helmet><title>Live Auction — StreamVibe Tools</title></Helmet>

      {engine.newLeaderName && <NewLeaderPop name={engine.newLeaderName} />}

      <div className="flex flex-1 overflow-hidden">
        <AuctionLeft   engine={engine} />
        <AuctionCenter engine={engine} tiktok={tiktok} connError={connError} onClearError={() => setConnError(null)} overlayUrl={overlayUrl} />
        <AuctionRight  engine={engine} />
      </div>
    </div>
  );
};

export default AuctionTool;
