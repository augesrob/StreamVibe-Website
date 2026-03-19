/** CannonLeaderboard — right panel (Ball Guys Cannon Blast) */
import React from 'react';
const MEDAL = ['🥇','🥈','🥉'];

export default function CannonLeaderboard({ engine }) {
  const { leaderboard, roundCount, currentDist, bestScore, finalScore, phase } = engine;

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Score summary */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-3">This Round</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Distance', currentDist ? `${currentDist}m` : '—', 'text-cyan-400'],
            ['Score',    finalScore > 0 ? finalScore : (phase==='rolling' ? '…' : '—'), 'text-yellow-400'],
            ['Best',     bestScore > 0 ? bestScore : '—', 'text-yellow-300'],
            ['Round',    `#${roundCount}`, 'text-gray-400'],
          ].map(([l,v,c])=>(
            <div key={l} className="bg-[#0a0b14] rounded-lg p-2 text-center border border-[#1e2240]">
              <div className="text-[9px] text-gray-700 uppercase tracking-widest">{l}</div>
              <div className={`text-sm font-black font-mono ${c}`}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-yellow-400">🏆</span>
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Top Scores</span>
          <span className="ml-auto text-[10px] text-gray-600">Round #{roundCount}</span>
        </div>
        {leaderboard.length === 0
          ? <p className="text-gray-700 text-xs text-center py-4">No scores yet — launch the ball!</p>
          : leaderboard.slice(0, 10).map((e, i) => (
              <div key={e.ts} className="flex items-center gap-2 py-1.5 border-b border-[#1e2240] last:border-0">
                <span className="text-sm w-5">{MEDAL[i] ?? `${i+1}.`}</span>
                <span className="text-xs text-gray-300 flex-1 truncate font-semibold">@{e.user}</span>
                <span className="text-xs font-black text-yellow-400">{e.score} pts</span>
                <span className="text-[9px] text-gray-600">{e.dist}m</span>
              </div>
            ))
        }
      </div>

      {/* How to play */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-3">How to Play</div>
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex gap-2"><span>🎁</span><span><strong className="text-purple-400">Pick 3 chests</strong> to get multipliers</span></div>
          <div className="flex gap-2"><span>⚡</span><span><strong className="text-orange-400">Hold CHARGE</strong> or send gifts to fill the bar</span></div>
          <div className="flex gap-2"><span>💥</span><span><strong className="text-yellow-400">Release to FIRE</strong> the cannon!</span></div>
          <div className="flex gap-2"><span>💣</span><span><strong className="text-orange-400">Bombs</strong> blast ball forward</span></div>
          <div className="flex gap-2"><span>🟡</span><span><strong className="text-purple-400">Bouncers</strong> launch ball upward</span></div>
          <div className="flex gap-2"><span>⚡</span><span><strong className="text-cyan-400">Power-ups</strong> add rolling speed</span></div>
          <div className="flex gap-2"><span>🎯</span><span>Score = distance × <strong className="text-green-400">zone multiplier</strong></span></div>
        </div>
      </div>

      {/* Floor zone guide */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-2">🗺 Floor Zones</div>
        {[
          {label:'0–50m',   mult:'1×', color:'#22cc44'},
          {label:'50–100m', mult:'2×', color:'#44cc88'},
          {label:'100–160m',mult:'3×', color:'#44cccc'},
          {label:'160–220m',mult:'4×', color:'#4488cc'},
          {label:'220m+',   mult:'5×', color:'#9944cc'},
        ].map((z,i)=>(
          <div key={i} className="flex items-center gap-2 text-xs mb-1">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{background:z.color}}/>
            <span className="text-gray-400 flex-1">{z.label}</span>
            <span className="font-black" style={{color:z.color}}>{z.mult}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
