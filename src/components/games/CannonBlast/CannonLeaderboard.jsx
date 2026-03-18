/** CannonLeaderboard — right panel */
import React from 'react';

const MEDAL = ['🥇','🥈','🥉'];

export default function CannonLeaderboard({ engine }) {
  const { leaderboard, roundCount } = engine;

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-yellow-400 text-base">🏆</span>
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Leaderboard</span>
          <span className="ml-auto text-[10px] text-gray-600">Round #{roundCount}</span>
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-gray-700 text-xs text-center py-4">No shots fired yet!</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <div key={entry.ts ?? i}
                className="flex items-center gap-2 bg-[#0a0b14] rounded-lg px-3 py-2 border border-[#1e2240]">
                <span className="text-lg w-6 text-center">{MEDAL[i] ?? `${i+1}.`}</span>
                <span className="text-sm font-bold text-white truncate flex-1">@{entry.user}</span>
                <span className="text-yellow-400 font-mono font-black text-sm">{entry.distance}m</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent blast feed */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4 flex-1">
        <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3">💥 Recent Blasts</div>
        {leaderboard.length === 0 ? (
          <p className="text-gray-700 text-xs text-center py-4">Waiting for first shot…</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {[...leaderboard].sort((a,b) => b.ts - a.ts).slice(0, 15).map((entry, i) => (
              <div key={entry.ts ?? i} className="flex items-center gap-2 text-xs">
                <span className="text-orange-400">💥</span>
                <span className="text-gray-400 truncate flex-1">@{entry.user}</span>
                <span className="text-cyan-400 font-mono font-bold">{entry.distance}m</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
