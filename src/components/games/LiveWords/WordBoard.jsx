/**
 * WordBoard — displays the current letter set as Scrabble-style tiles
 */
import React from 'react';

function LetterTile({ letter, used }) {
  return (
    <div className={`
      w-10 h-10 rounded-lg flex items-center justify-center
      font-black text-lg select-none transition-all
      ${used
        ? 'bg-gradient-to-b from-cyan-300 to-cyan-500 text-[#001830] shadow-[0_0_12px_rgba(0,229,255,0.5)] border border-cyan-300'
        : 'bg-gradient-to-b from-white to-slate-200 text-[#2d0070] shadow-[0_3px_0_rgba(0,0,0,0.3)] border border-white/60'
      }
    `} style={{ fontFamily: '"Arial Black", Impact, sans-serif' }}>
      {letter.toUpperCase()}
    </div>
  );
}

export default function WordBoard({ letters, foundWords, phase }) {
  if (!letters.length) return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-600">
      <span className="text-4xl mb-2">🔤</span>
      <p className="text-xs font-semibold text-center">Press START ROUND to generate letters</p>
    </div>
  );

  // Track which letter indices have been used
  const usedIndices = new Set();
  for (const { word } of foundWords) {
    const pool = letters.map((l, i) => ({ l: l.toLowerCase(), i }));
    for (const ch of word.toLowerCase()) {
      const idx = pool.findIndex(p => p.l === ch && !usedIndices.has(p.i));
      if (idx !== -1) { usedIndices.add(pool[idx].i); pool.splice(idx, 1); }
    }
  }

  const phaseBadge = {
    running:  { cls: 'bg-green-900/40 border-green-700/50 text-green-400', label: '🟢 ROUND LIVE' },
    finished: { cls: 'bg-red-900/40 border-red-700/50 text-red-400',       label: '🔴 ROUND ENDED' },
    idle:     { cls: 'bg-gray-800 border-gray-700 text-gray-500',           label: '⚪ WAITING' },
  }[phase] ?? { cls: 'bg-gray-800 border-gray-700 text-gray-500', label: '⚪ WAITING' };

  return (
    <div className="flex flex-col items-center gap-3">
      <span className={`text-[10px] font-bold tracking-widest px-3 py-1 rounded-full border ${phaseBadge.cls}`}>
        {phaseBadge.label}
      </span>

      {/* Letter tiles in a grid */}
      <div className="flex flex-wrap justify-center gap-2 px-2">
        {letters.map((letter, i) => (
          <LetterTile key={i} letter={letter} used={usedIndices.has(i)} />
        ))}
      </div>

      <p className="text-gray-600 text-[10px] text-center">
        Type <span className="text-cyan-600 font-mono font-bold">!word answer</span> in chat
      </p>
    </div>
  );
}
