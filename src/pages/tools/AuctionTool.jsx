import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuctionEngine } from '@/hooks/useAuctionEngine';
import { useTikTokConnector } from '@/hooks/useTikTokConnector';
import AuctionLeft   from '@/components/tools/AuctionLeft';
import AuctionCenter from '@/components/tools/AuctionCenter';
import AuctionRight  from '@/components/tools/AuctionRight';
import NewLeaderPop  from '@/components/tools/NewLeaderPop';

const AuctionTool = () => {
  const engine = useAuctionEngine();
  const [connError, setConnError] = useState(null);

  const tiktok = useTikTokConnector({
    onGift:  (user, coins) => engine.processBid(user, coins),
    onError: (msg)         => setConnError(msg),
  });

  // Sync state to localStorage so /overlay can poll it
  useEffect(() => {
    try {
      localStorage.setItem('sv_auction_overlay_state', JSON.stringify({
        phase:      engine.phase,
        remaining:  engine.remaining,
        snipeDelay: engine.snipeDelay,
        leader:     engine.leader,
        minCoins:   engine.minCoins,
        theme:      engine.theme,
      }));
    } catch (_) {}
  }, [
    engine.phase, engine.remaining, engine.snipeDelay,
    engine.leader, engine.minCoins, engine.theme,
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#0a0b14] text-white overflow-hidden">
      <Helmet><title>Live Auction — StreamVibe Tools</title></Helmet>

      {engine.newLeaderName && <NewLeaderPop name={engine.newLeaderName} />}

      <div className="flex flex-1 overflow-hidden">
        <AuctionLeft   engine={engine} />
        <AuctionCenter engine={engine} tiktok={tiktok} connError={connError} onClearError={() => setConnError(null)} />
        <AuctionRight  engine={engine} />
      </div>
    </div>
  );
};

export default AuctionTool;
