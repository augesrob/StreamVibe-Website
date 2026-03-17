/**
 * WordFeed — found-words feed + leaderboard panel
 */
import React from 'react';
import { Trophy, Star } from 'lucide-react';

const MEDAL = ['🥇','🥈','🥉'];

function ScorePill({ score }) {
  let cls = 'text-gray-400 border-gray-700';
  if (score >= 10) cls = 'text-orange-400 border-orange-700';
  else if (score >= 6) cls = 'text-yellow-400 border-yellow-800';
  else if (score >= 4) cls = 'text-cyan-400 border-cyan-800';
  else if (score >= 2) cls = 'text-blue-400 border-blue-800';
  return (
    <span className={`text-[10px] font-black font-mono border rounded px-1.5 py-0.5 ${cls}`}>
      +{score}
    </span>
  );
}

export default function WordFeed({ foundWords, leaderboard, possibleWords, phase }) {
  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">

      {/* Leaderboard */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Leaderboard</span>
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-gray-700 text-xs text-center py-2">No scores yet — start a round!</p>
        ) : (
          <div className="space-y-1.5">
            {leaderboard.slice(0, 8).map((entry, i) => (
              <div key={entry.user}
                className="flex items-center justify-between bg-[#0d0e1a] rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base w-5 text-center">{MEDAL[i] ?? `${i+1}.`}</span>
                  <span className="text-sm font-bold text-white truncate max-w-[110px]">
                    @{entry.user}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span className="text-yellow-400 font-mono font-black text-sm">{entry.score}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Found Words Feed */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl flex flex-col flex-1 overflow-hidden">
        <div className="p-3 border-b border-[#1e2240] flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">
            Found Words
          </span>
          <span className="text-[10px] text-gray-600 font-mono">
            {foundWords.length} / {possibleWords.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {foundWords.length === 0 ? (
            <p className="text-gray-700 text-xs text-center py-4">
              Waiting for viewers to submit words…
            </p>
          ) : (
            foundWords.map((fw, i) => (
              <div key={fw.ts ?? i}
                className="flex items-center justify-between bg-[#0d0e1a] rounded-lg px-3 py-1.5
                  border border-transparent hover:border-cyan-900/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-mono font-black text-sm uppercase">
                    {fw.word}
                  </span>
                  <span className="text-gray-600 text-[10px]">@{fw.user}</span>
                </div>
                <ScorePill score={fw.score} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Possible words hint (only shown when round finished) */}
      {phase === 'finished' && possibleWords.length > 0 && (
        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3 flex-shrink-0">
          <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">
            All Possible Words ({possibleWords.length})
          </p>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {possibleWords.map(w => (
              <span key={w}
                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#0d0e1a]
                  text-gray-500 border border-gray-800 uppercase">
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
