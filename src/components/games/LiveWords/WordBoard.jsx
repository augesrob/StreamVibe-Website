/**
 * WordBoard — displays the current letter set in a visual circular arrangement.
 */
import React from 'react';

const ANGLES_7 = [270, 321, 13, 65, 117, 169, 221]; // degrees for 7 letters
const ANGLES_6 = [270, 330, 30, 90, 150, 210];
const ANGLES_8 = [270, 315, 0, 45, 90, 135, 180, 225];

function getAngles(n) {
  if (n <= 6) return ANGLES_6.slice(0, n);
  if (n === 7) return ANGLES_7;
  return ANGLES_8.slice(0, n);
}

export default function WordBoard({ letters, foundWords, phase }) {
  if (!letters.length) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-600">
      <span className="text-5xl mb-3">🔤</span>
      <p className="text-sm font-semibold">Press START ROUND to generate letters</p>
    </div>
  );

  // Which letters have been used at least once in found words
  const usedLetterCounts = {};
  for (const { word } of foundWords) {
    const pool = [...letters.map(l => l.toLowerCase())];
    for (const ch of word) {
      const idx = pool.indexOf(ch);
      if (idx !== -1) {
        usedLetterCounts[idx] = (usedLetterCounts[idx] ?? 0) + 1;
        pool[idx] = null;
      }
    }
  }

  const angles  = getAngles(letters.length);
  const R       = 110; // radius in px
  const CX      = 160; // SVG centre
  const CY      = 160;
  const SIZE    = 320;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phase badge */}
      <div className={`text-xs font-bold tracking-widest px-3 py-1 rounded-full border
        ${phase === 'running'
          ? 'bg-green-900/30 border-green-700/40 text-green-400'
          : phase === 'finished'
          ? 'bg-red-900/30 border-red-700/40 text-red-400'
          : 'bg-gray-800 border-gray-700 text-gray-500'
        }`}>
        {phase === 'running' ? '🟢 ROUND LIVE' : phase === 'finished' ? '🔴 ROUND ENDED' : '⚪ WAITING'}
      </div>

      {/* SVG letter circle */}
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="select-none drop-shadow-xl">
        {/* Connecting lines */}
        {letters.map((_, i) => {
          const a1 = (angles[i] * Math.PI) / 180;
          const a2 = (angles[(i + 1) % letters.length] * Math.PI) / 180;
          return (
            <line key={i}
              x1={CX + R * Math.cos(a1)} y1={CY + R * Math.sin(a1)}
              x2={CX + R * Math.cos(a2)} y2={CY + R * Math.sin(a2)}
              stroke="rgba(0,229,255,0.12)" strokeWidth="1.5" />
          );
        })}

        {/* Letter circles */}
        {letters.map((letter, i) => {
          const angle  = (angles[i] * Math.PI) / 180;
          const cx     = CX + R * Math.cos(angle);
          const cy     = CY + R * Math.sin(angle);
          const isUsed = !!usedLetterCounts[i];
          return (
            <g key={i} transform={`translate(${cx},${cy})`}>
              <circle r={26} fill={isUsed ? 'rgba(0,229,255,0.25)' : 'rgba(21,24,40,0.95)'}
                stroke={isUsed ? '#00e5ff' : '#2a3050'} strokeWidth={isUsed ? 2 : 1.5} />
              <text x={0} y={1} textAnchor="middle" dominantBaseline="middle"
                fontSize={20} fontWeight="900" fontFamily="monospace"
                fill={isUsed ? '#00e5ff' : '#e2e8f0'}>
                {letter.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Centre dot */}
        <circle cx={CX} cy={CY} r={8} fill="rgba(0,229,255,0.15)"
          stroke="rgba(0,229,255,0.3)" strokeWidth={1.5} />
      </svg>

      {/* Hint */}
      <p className="text-gray-600 text-xs text-center">
        Viewers type the command + a word using these letters in chat
      </p>
    </div>
  );
}
