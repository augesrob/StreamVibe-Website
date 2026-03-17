import React from 'react';

const phaseStyle = {
  idle:     'bg-gray-900/50 text-gray-600',
  running:  'bg-green-950/30 text-green-400',
  snipe:    'bg-red-950/30 text-red-400 animate-pulse',
  paused:   'bg-orange-950/30 text-orange-400',
  finished: 'bg-yellow-950/30 text-yellow-400',
};
const phaseLabel = {
  idle: '–', running: '● LIVE', snipe: '🛡 SNIPE', paused: 'PAUSED', finished: '🏁 DONE',
};

export default function AuctionRight({ engine }) {
  const { leader, bids, phase } = engine;

  return (
    <div className="w-[275px] flex-shrink-0 border-l border-[#1e2240] bg-[#10121f] flex flex-col gap-4 p-4 overflow-y-auto">

      {/* Current Leader */}
      <div className="bg-gradient-to-br from-yellow-950/20 to-orange-950/10 border border-yellow-900/25 rounded-xl p-4">
        <div className="text-[10px] font-bold tracking-widest text-yellow-700 uppercase mb-1">👑 Current Leader</div>
        <div className="font-mono font-black text-lg text-yellow-400 truncate">
          {leader ? leader.user : 'None'}
        </div>
        {leader && (
          <div className="text-sm text-yellow-700 mt-0.5">🪙 {leader.coins.toLocaleString()} coins</div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-600">PHASE</span>
          <span className={`font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 rounded ${phaseStyle[phase] || phaseStyle.idle}`}>
            {phaseLabel[phase] || '–'}
          </span>
        </div>
      </div>

      {/* Snipe alert */}
      {phase === 'snipe' && (
        <div className="bg-red-950/20 border border-red-700/40 rounded-xl p-3 text-center text-red-400 font-mono font-bold text-xs tracking-widest animate-pulse">
          🛡 SNIPE ZONE ACTIVE!
        </div>
      )}

      {/* Bid Feed */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4 flex flex-col flex-1 min-h-0">
        <div className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase mb-3">📊 Bid Feed</div>
        <div className="flex flex-col gap-2 overflow-y-auto flex-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#1e2240]">
          {bids.length === 0 ? (
            <div className="text-gray-600 text-sm text-center py-6">Bids will appear here</div>
          ) : (
            bids.map((b, i) => (
              <div
                key={b.id}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 animate-in fade-in duration-200
                  ${i === 0
                    ? 'bg-yellow-950/20 border border-yellow-900/30'
                    : 'bg-[#0a0b14] border border-[#1e2240]'
                  }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-mono font-black text-xs text-black"
                  style={{ background: b.color }}
                >
                  {b.user[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{b.user}</div>
                </div>
                <div className="font-mono text-xs font-bold text-yellow-400 flex-shrink-0">
                  🪙 {b.coins.toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
