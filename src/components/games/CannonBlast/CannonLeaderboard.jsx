import React from 'react';

export default function CannonLeaderboard({ engine }) {
  const { leaderboard, roundCount, bestScore, auctionBids, phase } = engine;

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs text-gray-500 font-black tracking-wider">🏆 LEADERBOARD</div>

      {leaderboard.length === 0 ? (
        <div className="text-gray-600 text-sm text-center py-8">No scores yet.<br/>Launch the cannon!</div>
      ) : (
        <div className="space-y-2">
          {leaderboard.slice(0,10).map((entry, i) => {
            const medals = ['🥇','🥈','🥉'];
            const colors = ['#ffd700','#c0c0c0','#cd7f32'];
            return (
              <div key={entry.ts ?? i}
                className="bg-[#0d0e1a] rounded-xl p-3 border border-[#1e2240]"
                style={{ borderColor: i < 3 ? `${colors[i]}44` : '#1e2240' }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{medals[i] ?? `${i+1}.`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-white truncate text-sm">@{entry.user}</div>
                    <div className="text-xs text-gray-500">{entry.dist}m distance</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm" style={{ color: colors[i] ?? '#aaa', fontFamily:'monospace' }}>
                      {entry.score}
                    </div>
                    <div className="text-xs text-gray-600">pts</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {bestScore > 0 && (
        <div className="bg-[#1a1200] rounded-xl p-3 border border-yellow-900/50 text-center">
          <div className="text-xs text-yellow-600 tracking-wider">ALL-TIME BEST</div>
          <div className="text-2xl font-black text-yellow-400 font-mono">{bestScore}</div>
          <div className="text-xs text-yellow-600">points</div>
        </div>
      )}

      <div className="bg-[#0d0e1a] rounded-xl p-3 border border-[#1e2240] text-center">
        <div className="text-xs text-gray-600 tracking-wider">ROUND</div>
        <div className="text-3xl font-black text-white">#{roundCount}</div>
      </div>

      {/* Auction summary (if available) */}
      {phase === 'auction' && Object.keys(auctionBids).length > 0 && (
        <div className="bg-[#120d00] rounded-xl p-3 border border-yellow-900/40">
          <div className="text-xs text-yellow-500 font-black tracking-wider mb-2">LIVE BIDS</div>
          {Object.entries(auctionBids).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([u,c],i)=>(
            <div key={u} className="flex items-center gap-2 text-xs mb-1">
              <span className="text-yellow-400 font-black w-5">{i+1}.</span>
              <span className="flex-1 text-white font-bold truncate">@{u}</span>
              <span className="text-yellow-400 font-mono">{c.toLocaleString()}💎</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
