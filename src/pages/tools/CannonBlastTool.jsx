/**
 * CannonBlastTool — full-page game controller
 * Route: /tools/games/cannon-blast
 */
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useCannonEngine } from '@/hooks/useCannonEngine';
import { useTikTokGameConnector } from '@/hooks/useTikTokGameConnector';
import CannonGame       from '@/components/games/CannonBlast/CannonGame';
import CannonControls   from '@/components/games/CannonBlast/CannonControls';
import CannonLeaderboard from '@/components/games/CannonBlast/CannonLeaderboard';
import GamePlanGate     from '@/components/games/GamePlanGate';
import GAME_REGISTRY    from '@/components/games/GameRegistry';
import { useAuth }      from '@/contexts/SupabaseAuthContext';
import { supabase }     from '@/lib/customSupabaseClient';

const GAME = GAME_REGISTRY.cannon_blast;

export default function CannonBlastTool() {
  const engine = useCannonEngine();
  const { user } = useAuth();
  const [connError, setConnError] = useState(null);
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
    channelRef.current.send({ type: 'broadcast', event: 'state', payload: {
      phase: engine.phase, ballPos: engine.ballPos, distance: engine.distance,
      topDistance: engine.topDistance, angle: engine.angle,
      leaderboard: engine.leaderboard.slice(0, 5), activeBoost: engine.activeBoost,
      lastShooter: engine.lastShooter, roundCount: engine.roundCount,
    }});
  }, [engine.phase, engine.ballPos, engine.activeBoost, engine.distance]);

  const tiktok = useTikTokGameConnector({
    onGift: (u, coins) => engine.processGift(u, coins),
    onChat:  () => {},
    onError: (msg) => setConnError(msg),
  });

  const overlayUrl = overlayToken
    ? `${window.location.origin}/games-overlay/cannon-blast?token=${overlayToken}`
    : null;

  return (
    <GamePlanGate game={GAME}>
      <div className="flex flex-col h-[calc(100vh-64px)] mt-16 bg-[#0a0b14] text-white overflow-hidden">
        <Helmet><title>Cannon Blast — StreamVibe Games</title></Helmet>

        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1e2240] bg-[#0d0e1a] flex-shrink-0">
          <span className="text-2xl">💥</span>
          <div>
            <h1 className="font-black text-lg text-white leading-tight">StreamVibe Cannon Blast</h1>
            <p className="text-gray-500 text-xs">Viewers gift to boost the cannon — who goes furthest?</p>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left controls */}
          <div className="w-72 border-r border-[#1e2240] overflow-y-auto flex-shrink-0">
            <CannonControls engine={engine} tiktok={tiktok} connError={connError}
              onClearError={() => setConnError(null)} overlayUrl={overlayUrl} />
          </div>
          {/* Center game */}
          <div className="flex-1 p-5 overflow-y-auto">
            <CannonGame engine={engine} overlayUrl={overlayUrl} />
          </div>
          {/* Right leaderboard */}
          <div className="w-72 border-l border-[#1e2240] overflow-y-auto flex-shrink-0">
            <CannonLeaderboard engine={engine} />
          </div>
        </div>
      </div>
    </GamePlanGate>
  );
}

