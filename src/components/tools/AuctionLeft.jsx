import React from 'react';

function fmt(s) {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const timerColor = (remaining, snipeDelay) => {
  if (remaining <= 10 && remaining > 0) return 'text-red-500 animate-pulse';
  if (remaining <= snipeDelay && remaining > 0) return 'text-yellow-400';
  return 'text-green-400';
};

export default function AuctionLeft({ engine }) {
  const { remaining, snipeDelay, totalDuration, minCoins,
          setDuration, setSnipeDelay, setMinCoins, sessionHistory } = engine;

  const durMin = Math.floor(totalDuration / 60);
  const durSec = totalDuration % 60;

  return (
    <div className="w-[300px] flex-shrink-0 border-r border-[#1e2240] bg-[#10121f] flex flex-col gap-4 p-4 overflow-y-auto">

      {/* Live Status */}
      <div>
        <div className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase mb-1">Live Status</div>
        <div className="border border-[#1e2240] rounded-lg p-3 text-center bg-[#0a0b14]">
          <div className="text-xs text-gray-500 tracking-widest uppercase mb-1">Time Remaining</div>
          <div className={`font-mono text-4xl font-black ${timerColor(remaining, snipeDelay)}`}>
            {fmt(remaining)}
          </div>
        </div>
      </div>

      {/* Timer Settings */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase mb-3">⏱ Timer Settings</div>
        <div className="text-xs text-gray-400 font-semibold mb-2">Match Duration</div>
        <div className="flex items-center gap-2">
          <div>
            <input
              type="number" min="0" max="99"
              defaultValue={durMin}
              onChange={e => setDuration((+e.target.value || 0) * 60 + durSec)}
              className="w-14 bg-[#0a0b14] border border-[#1e2240] rounded-lg text-center font-mono text-xl font-black text-white p-2 outline-none focus:border-cyan-500"
            />
            <div className="text-[10px] text-gray-500 text-center mt-1">min</div>
          </div>
          <div className="font-mono text-xl font-black text-gray-500 pb-3">:</div>
          <div>
            <input
              type="number" min="0" max="59"
              defaultValue={durSec}
              onChange={e => setDuration(durMin * 60 + (+e.target.value || 0))}
              className="w-14 bg-[#0a0b14] border border-[#1e2240] rounded-lg text-center font-mono text-xl font-black text-white p-2 outline-none focus:border-cyan-500"
            />
            <div className="text-[10px] text-gray-500 text-center mt-1">sec</div>
          </div>
        </div>
      </div>

      {/* Snipe Delay */}
      <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
        <div className="text-[11px] font-bold tracking-widest text-red-400 uppercase mb-3">🛡 Snipe Delay</div>
        <div className="text-center">
          <input
            type="number" min="1" max="300"
            value={snipeDelay}
            onChange={e => setSnipeDelay(+e.target.value || 5)}
            className="w-24 bg-[#0a0b14] border border-red-900/40 rounded-lg text-center font-mono text-2xl font-black text-red-400 p-2 outline-none"
          />
          <div className="text-xs text-red-900 mt-1">sec</div>
          <div className="text-[10px] text-red-900/70 mt-1">Added when entry in last seconds</div>
        </div>
      </div>

      {/* Overlay Badges */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold tracking-widest text-purple-400 uppercase">📺 Overlay Badges</div>
          <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded font-bold">NEW</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" defaultChecked className="accent-cyan-500 w-4 h-4" />
          <span className="font-bold text-sm flex-1">💎 MINIMUM</span>
          <input
            type="number" min="1"
            value={minCoins}
            onChange={e => setMinCoins(+e.target.value || 1)}
            className="w-14 bg-[#0a0b14] border border-[#1e2240] rounded text-center font-mono font-bold text-sm text-white p-1 outline-none"
          />
          <span className="text-xs text-gray-500">coins</span>
        </div>
      </div>

      {/* Session History */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4 flex-1">
        <div className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase mb-3">📋 Session History</div>
        {sessionHistory.length === 0 ? (
          <div className="text-gray-600 text-sm text-center py-4">No sessions yet</div>
        ) : (
          <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
            {sessionHistory.map((s, i) => (
              <div key={i} className="bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-2 flex justify-between items-center text-xs">
                <span className="text-yellow-400 font-bold font-mono">👑 {s.winner}</span>
                <span className="text-gray-500">🪙 {s.coins.toLocaleString()} · {s.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
