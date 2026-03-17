/**
 * LiveWordsTool — full-page game controller
 * Route: /tools/games/live-words  (protected + plan-gated)
 */
import React from 'react';
import { Helmet } from 'react-helmet';
import { useLiveWordsEngine }      from '@/hooks/useLiveWordsEngine';
import { useTikTokGameConnector }  from '@/hooks/useTikTokGameConnector';
import WordBoard                   from '@/components/games/LiveWords/WordBoard';
import WordFeed                    from '@/components/games/LiveWords/WordFeed';
import WordCenter                  from '@/components/games/LiveWords/WordCenter';
import WordSettings                from '@/components/games/LiveWords/WordSettings';
import GamePlanGate                from '@/components/games/GamePlanGate';
import GAME_REGISTRY               from '@/components/games/GameRegistry';
import { useState } from 'react';

const GAME = GAME_REGISTRY.live_words;

export default function LiveWordsTool() {
  const engine  = useLiveWordsEngine();
  const [connError, setConnError] = useState(null);

  const tiktok = useTikTokGameConnector({
    onChat:  (user, text) => engine.processChatMessage(user, text),
    onGift:  () => {},
    onError: (msg) => setConnError(msg),
  });

  return (
    <GamePlanGate game={GAME}>
      <div className="flex flex-col h-[calc(100vh-64px)] bg-[#0a0b14] text-white overflow-hidden">
        <Helmet><title>Live Words — StreamVibe Games</title></Helmet>

        {/* Header bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1e2240] bg-[#0d0e1a] flex-shrink-0">
          <span className="text-2xl">🔤</span>
          <div>
            <h1 className="font-black text-lg text-white leading-tight">StreamVibe Live Words</h1>
            <p className="text-gray-500 text-xs">Round #{engine.roundNum || '—'} · {engine.possibleWords.length} possible words</p>
          </div>
        </div>


        {/* Three-column layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — Letter board + settings */}
          <div className="w-72 border-r border-[#1e2240] flex flex-col overflow-y-auto p-4 gap-4">
            <WordBoard
              letters={engine.letters}
              foundWords={engine.foundWords}
              phase={engine.phase}
            />
            <WordSettings engine={engine} />
          </div>

          {/* CENTER — Controls */}
          <WordCenter
            engine={engine}
            tiktok={tiktok}
            connError={connError}
            onClearError={() => setConnError(null)}
          />

          {/* RIGHT — Feed + leaderboard */}
          <div className="w-80 border-l border-[#1e2240] flex flex-col overflow-hidden p-4">
            <WordFeed
              foundWords={engine.foundWords}
              leaderboard={engine.leaderboard}
              possibleWords={engine.possibleWords}
              phase={engine.phase}
            />
          </div>
        </div>
      </div>
    </GamePlanGate>
  );
}
