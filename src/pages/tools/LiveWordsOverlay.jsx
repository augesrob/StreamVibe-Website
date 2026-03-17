/**
 * LiveWordsOverlay — browser-source overlay for TikTok Live Studio
 * Route: /games-overlay/live-words  (public, no auth)
 * Polls localStorage key: sv_livewords_overlay
 */
import React, { useState, useEffect } from 'react';

function LetterCircle({ letters }) {
  if (!letters?.length) return null;
  const count = letters.length;
  const R = 90, CX = 130, CY = 130;
  const angles = Array.from({ length: count }, (_, i) => (i * 360) / count - 90);
  return (
    <svg width={260} height={260} viewBox="0 0 260 260" className="drop-shadow-2xl">
      {letters.map((l, i) => {
        const a  = (angles[i] * Math.PI) / 180;
        const cx = CX + R * Math.cos(a);
        const cy = CY + R * Math.sin(a);
        return (
          <g key={i} transform={`translate(${cx},${cy})`}>
            <circle r={24} fill="rgba(0,10,30,0.88)" stroke="#00e5ff" strokeWidth={2.5} />
            <text x={0} y={1} textAnchor="middle" dominantBaseline="middle"
              fontSize={18} fontWeight="900" fontFamily="monospace" fill="#00e5ff">
              {l.toUpperCase()}
            </text>
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r={7} fill="rgba(0,229,255,0.2)" stroke="rgba(0,229,255,0.4)" strokeWidth={1.5} />
    </svg>
  );
}

function WordEntry({ word, user, score, idx }) {
  return (
    <div className={`flex items-center gap-2 text-sm animate-fade-in
      ${idx === 0 ? 'opacity-100' : idx < 4 ? 'opacity-80' : 'opacity-50'}`}>
      <span className="font-mono font-black text-cyan-300 uppercase">{word}</span>
      <span className="text-gray-500 text-[10px]">@{user}</span>
      <span className="ml-auto text-yellow-400 font-black text-xs">+{score}</span>
    </div>
  );
}

function Leaderboard({ leaders }) {
  const MEDAL = ['🥇','🥈','🥉'];
  return (
    <div className="space-y-1">
      {leaders.slice(0, 5).map((l, i) => (
        <div key={l.user} className="flex items-center gap-2 text-sm">
          <span className="w-5 text-center">{MEDAL[i] ?? `${i+1}.`}</span>
          <span className="text-white font-bold truncate max-w-[100px]">@{l.user}</span>
          <span className="ml-auto text-yellow-400 font-mono font-black">{l.score}</span>
        </div>
      ))}
    </div>
  );
}

export default function LiveWordsOverlay() {
  const [state, setState] = useState(null);

  useEffect(() => {
    const poll = () => {
      try {
        const raw = localStorage.getItem('sv_livewords_overlay');
        if (raw) setState(JSON.parse(raw));
      } catch (_) {}
    };
    poll();
    const id = setInterval(poll, 800);
    return () => clearInterval(id);
  }, []);

  if (!state || state.phase === 'idle') {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="bg-black/70 border border-cyan-900/40 rounded-2xl px-8 py-6 text-center">
          <span className="text-4xl">🔤</span>
          <p className="text-cyan-400 font-black text-lg mt-2">StreamVibe Live Words</p>
          <p className="text-gray-500 text-xs mt-1">Waiting for host to start round…</p>
        </div>
      </div>
    );
  }

  const mins = String(Math.floor((state.remaining ?? 0) / 60)).padStart(2, '0');
  const secs = String((state.remaining ?? 0) % 60).padStart(2, '0');
  const isFinished = state.phase === 'finished';

  return (
    <div className="w-screen h-screen bg-transparent flex items-end justify-between p-6 gap-4">

      {/* Left — Letter Circle + Timer */}
      <div className="flex flex-col items-center gap-2">
        <div className={`font-mono font-black text-4xl drop-shadow-lg
          ${isFinished ? 'text-red-400' : 'text-green-400'}`}>
          {isFinished ? 'ROUND OVER' : `${mins}:${secs}`}
        </div>
        <LetterCircle letters={state.letters ?? []} />
        <div className="bg-black/60 border border-cyan-900/40 rounded-lg px-3 py-1 text-[11px]
          text-cyan-500 font-bold font-mono">
          Round #{state.roundNum ?? 1}
        </div>
      </div>

      {/* Right — Recent words + leaderboard */}
      <div className="flex flex-col gap-3 min-w-[200px] max-w-[220px]">
        <div className="bg-black/70 border border-cyan-900/30 rounded-xl p-3">
          <p className="text-[10px] text-cyan-700 font-bold uppercase tracking-widest mb-2">
            Recent Words
          </p>
          <div className="space-y-1">
            {(state.foundWords ?? []).slice(0, 6).map((fw, i) => (
              <WordEntry key={fw.ts ?? i} {...fw} idx={i} />
            ))}
          </div>
        </div>
        {(state.leaderboard ?? []).length > 0 && (
          <div className="bg-black/70 border border-yellow-900/30 rounded-xl p-3">
            <p className="text-[10px] text-yellow-700 font-bold uppercase tracking-widest mb-2">
              Top Players
            </p>
            <Leaderboard leaders={state.leaderboard ?? []} />
          </div>
        )}
      </div>

    </div>
  );
}
