/**
 * LiveWordsTool — full-page game controller
 * Route: /tools/games/live-words  (protected + plan-gated)
 */
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useLiveWordsEngine }      from '@/hooks/useLiveWordsEngine';
import { useTikTokGameConnector }  from '@/hooks/useTikTokGameConnector';
import WordBoard                   from '@/components/games/LiveWords/WordBoard';
import WordFeed                    from '@/components/games/LiveWords/WordFeed';
import WordCenter                  from '@/components/games/LiveWords/WordCenter';
import WordSettings                from '@/components/games/LiveWords/WordSettings';
import GamePlanGate                from '@/components/games/GamePlanGate';
import GAME_REGISTRY               from '@/components/games/GameRegistry';
import { useAuth }                 from '@/contexts/SupabaseAuthContext';
import { supabase }                from '@/lib/customSupabaseClient';

const GAME = GAME_REGISTRY.live_words;

export default function LiveWordsTool() {
  const engine  = useLiveWordsEngine();
  const { user } = useAuth();
  const [connError, setConnError] = useState(null);
  const [overlayToken, setOverlayToken] = useState(null);
  const channelRef = useRef(null);

  // Fetch overlay token + set up Realtime broadcast channel
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: profile } = await supabase
        .from('profiles').select('overlay_token').eq('id', user.id).single();
      let token = profile?.overlay_token;
      if (!token) {
        token = crypto.randomUUID();
        await supabase.from('profiles').update({ overlay_token: token }).eq('id', user.id);
      }
      setOverlayToken(token);
      const ch = supabase.channel(`livewords:${user.id}`);
      channelRef.current = ch;
      ch.subscribe();
    };
    init();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user]);

  // Broadcast game state via Realtime whenever it changes
  useEffect(() => {
    if (!channelRef.current || !user) return;
    const payload = {
      phase: engine.phase, remaining: engine.remaining, letters: engine.letters,
      foundWords: engine.foundWords.slice(0, 8), leaderboard: engine.leaderboard.slice(0, 5),
      roundNum: engine.roundNum, totalDuration: engine.roundDuration,
    };
    channelRef.current.send({ type: 'broadcast', event: 'state', payload });
  }, [engine.phase, engine.remaining, engine.foundWords, engine.leaderboard]);

  const tiktok = useTikTokGameConnector({
    onChat:  (user, text) => engine.processChatMessage(user, text),
    onGift:  () => {},
    onError: (msg) => setConnError(msg),
  });

  const overlayUrl = overlayToken
    ? `${window.location.origin}/games-overlay/live-words?token=${overlayToken}`
    : null;

  return (
    <GamePlanGate game={GAME}>
      <div className="flex flex-col h-[calc(100vh-64px)] mt-16 bg-[#0a0b14] text-white overflow-hidden">
        <Helmet><title>Live Words — StreamVibe Games</title></Helmet>

        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1e2240] bg-[#0d0e1a] flex-shrink-0">
          <span className="text-2xl">🔤</span>
          <div className="flex-1">
            <h1 className="font-black text-lg text-white leading-tight">StreamVibe Live Words</h1>
            <p className="text-gray-500 text-xs">Round #{engine.roundNum || '—'} · {engine.possibleWords.length} possible words</p>
          </div>
          {/* Overlay URL button */}
          {overlayUrl && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open(overlayUrl, '_blank')}
                className="px-3 py-1.5 rounded-lg bg-[#151828] border border-[#1e2240] text-cyan-400
                  hover:border-cyan-600 font-mono text-xs font-bold transition-all">
                🖥 Overlay Preview
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(overlayUrl); }}
                className="px-3 py-1.5 rounded-lg bg-[#151828] border border-[#1e2240] text-gray-400
                  hover:border-gray-500 font-mono text-xs font-bold transition-all">
                📋 Copy Overlay URL
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 border-r border-[#1e2240] flex flex-col overflow-y-auto p-4 gap-4">
            <WordBoard letters={engine.letters} foundWords={engine.foundWords} phase={engine.phase} />
            <WordSettings engine={engine} />
          </div>
          <WordCenter engine={engine} tiktok={tiktok} connError={connError} onClearError={() => setConnError(null)} overlayUrl={overlayUrl} />
          <div className="w-80 border-l border-[#1e2240] flex flex-col overflow-hidden p-4">
            <WordFeed foundWords={engine.foundWords} leaderboard={engine.leaderboard} possibleWords={engine.possibleWords} phase={engine.phase} />
          </div>
        </div>
      </div>
    </GamePlanGate>
  );
}



