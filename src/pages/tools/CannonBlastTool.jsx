/**
 * CannonBlastTool v10
 */
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useCannonEngine, CHEST_PICKS, GIFT_TIERS } from '@/hooks/useCannonEngine';
import { useTikTokGameConnector } from '@/hooks/useTikTokGameConnector';
import CannonGame        from '@/components/games/CannonBlast/CannonGame';
import CannonControls    from '@/components/games/CannonBlast/CannonControls';
import CannonLeaderboard from '@/components/games/CannonBlast/CannonLeaderboard';
import GamePlanGate      from '@/components/games/GamePlanGate';
import GAME_REGISTRY     from '@/components/games/GameRegistry';
import { useAuth }       from '@/contexts/SupabaseAuthContext';
import { supabase }      from '@/lib/customSupabaseClient';

const GAME = GAME_REGISTRY.cannon_blast;

export default function CannonBlastTool() {
  const engine = useCannonEngine();
  const { user } = useAuth();
  const [connError,    setConnError]    = useState(null);
  const [overlayToken, setOverlayToken] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data } = await supabase.from('profiles').select('overlay_token').eq('id', user.id).single();
      let token = data?.overlay_token;
      if (!token) {
        token = crypto.randomUUID();
        await supabase.from('profiles').update({ overlay_token: token }).eq('id', user.id);
      }
      setOverlayToken(token);
      const ch = supabase.channel(`cannon:${user.id}`);
      channelRef.current = ch;
      ch.subscribe();
    };
    init();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user]);

  // Broadcast state to overlay
  useEffect(() => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({ type:'broadcast', event:'state', payload: {
      phase: engine.phase, ballX: engine.ballX, ballY: engine.ballY,
      ballRot: engine.ballRot, ballUser: engine.ballUser, camX: engine.camX,
      score: engine.score, bestScore: engine.bestScore, rewardLabel: engine.rewardLabel,
      currentMark: engine.currentMark, chargeLevel: engine.chargeLevel,
      multipliers: engine.multipliers, activeBoost: engine.activeBoost,
      leaderboard: engine.leaderboard.slice(0,8), roundCount: engine.roundCount,
      auctionBids: engine.auctionBids, auctionWinner: engine.auctionWinner,
      showChestPick: engine.showChestPick, recentGifts: engine.recentGifts,
      markers: engine.markers?.slice(0,20),
    }});
  }, [engine.phase, engine.ballX, engine.score, engine.chargeLevel,
      engine.activeBoost, engine.auctionBids, engine.showChestPick]);

  const tiktok = useTikTokGameConnector({
    onGift:  (u, coins) => engine.processGift(u, coins),
    onChat:  () => {},
    onError: (msg) => setConnError(msg),
  });

  const overlayUrl = overlayToken
    ? `${window.location.origin}/games-overlay/cannon-blast?token=${overlayToken}`
    : null;

  return (
    <GamePlanGate game={GAME}>
      <div className="flex flex-col h-[calc(100vh-64px)] mt-16 bg-[#0a0b14] text-white overflow-hidden">
        <Helmet><title>Ball Guys Cannon — StreamVibe</title></Helmet>
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1e2240] bg-[#0d0e1a] flex-shrink-0">
          <img src="/ballguys_icon.png" alt="" className="w-7 h-7 rounded-full"/>
          <div>
            <h1 className="font-black text-base text-white leading-tight">Ball Guys: Cannon Blast</h1>
            <p className="text-gray-500 text-xs">Auction → Pick chests → Gift to charge → Tap to shoot!</p>
          </div>
          <div className="ml-auto px-3 py-1 rounded-full bg-[#1e2240] text-xs font-black text-gray-400">
            {engine.phase.replace(/_/g,' ').toUpperCase()}
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r border-[#1e2240] overflow-y-auto flex-shrink-0">
            <CannonControls engine={engine} tiktok={tiktok}
              connError={connError} onClearError={()=>setConnError(null)} overlayUrl={overlayUrl}/>
          </div>
          <div className="flex-1 flex items-start justify-center p-3 overflow-y-auto">
            <div style={{ maxWidth:480, width:'100%' }}>
              <CannonGame engine={engine}/>
            </div>
          </div>
          <div className="w-60 border-l border-[#1e2240] overflow-y-auto flex-shrink-0">
            <CannonLeaderboard engine={engine}/>
          </div>
        </div>
      </div>
    </GamePlanGate>
  );
}
