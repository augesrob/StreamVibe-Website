/**
 * LiveWordsTool — full game page
 * Route: /tools/games/live-words  (protected + plan-gated)
 */
import React, { useState } from 'react';
import { Helmet }          from 'react-helmet';
import { useLiveWordsEngine }      from '@/hooks/useLiveWordsEngine';
import { useTikTokGameConnector }  from '@/hooks/useTikTokGameConnector';
import WordBoard  from '@/components/games/LiveWords/WordBoard';
import WordFeed   from '@/components/games/LiveWords/WordFeed';
import WordCenter from '@/components/games/LiveWords/WordCenter';
import GamePlanGate from '@/components/games/GamePlanGate';
import GAME_REGISTRY from '@/components/games/GameRegistry';

const GAME = GAME_REGISTRY.live_words;

export default function LiveWordsTool() {
  const engine = useLiveWordsEngine();
  const [connError, setConnError] = useState(null);

  const tiktok = useTikTokGameConnector({
    onChat:  (user, text) => engine.processChatMessage(user, text),
    onGift:  () => {},            // gifts unused in this game (reserved for future)
    onError: (msg) => setConnError(msg),
  });

  return (
    <GamePlanGate game={GAME}>
      <div className="flex flex-col h-[calc(100vh-64px)] bg-[#0a0b14] text-white overflow-hidden">
        <Helmet><title>Live Words — StreamVibe Games</title></Helmet>

        <div className="flex flex-1 overflow-hidden">

          {/* Left — letter board */}
          <div className="w-[300px] flex-shrink-0 border-r border-[#1e2240]
            flex flex-col items-center justify-start p-5 gap-4 overflow-y-auto">
            <div className="w-full">
              <h2 className="text-xl font-black text-white mb-0.5">🔤 Live Words</h2>
              <p className="text-gray-600 text-xs">Round #{engine.roundNum || '—'}</p>
            </div>
            <WordBoard
              letters={engine.letters}
              foundWords={engine.foundWords}
              phase={engine.phase}
            />
          </div>

          {/* Center — controls */}
          <WordCenter
            engine={engine}
            tiktok={tiktok}
            connError={connError}
            onClearError={() => setConnError(null)}
          />

          {/* Right — feed & leaderboard */}
          <div className="w-[300px] flex-shrink-0 border-l border-[#1e2240] p-4 overflow-hidden flex flex-col">
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
