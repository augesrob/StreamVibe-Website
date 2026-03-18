/**
 * CannonGame — the actual game canvas rendered in the tool page
 * Uses CSS transforms for smooth ball animation
 */
import React, { useMemo } from 'react';

// Scale: 1 game-metre → pixels on screen
const SCALE   = 6;
const CANVAS_W = 900;
const CANVAS_H = 320;
const CANNON_X = 60;
const GROUND_Y = CANVAS_H - 50;

function Cannon({ angle }) {
  return (
    <g transform={`translate(${CANNON_X}, ${GROUND_Y})`}>
      {/* Wheels */}
      <circle cx={-10} cy={8} r={18} fill="#333" stroke="#555" strokeWidth={3} />
      <circle cx={20} cy={8} r={18} fill="#333" stroke="#555" strokeWidth={3} />
      <circle cx={-10} cy={8} r={6} fill="#555" />
      <circle cx={20} cy={8} r={6} fill="#555" />
      {/* Body */}
      <rect x={-22} y={-8} width={54} height={18} rx={4} fill="#222" stroke="#444" strokeWidth={2} />
      {/* Barrel */}
      <g transform={`rotate(${-angle}, 12, 0)`}>
        <rect x={10} y={-10} width={55} height={20} rx={10} fill="#1a1a1a" stroke="#444" strokeWidth={2} />
        <rect x={55} y={-11} width={12} height={22} rx={4} fill="#111" stroke="#333" strokeWidth={2} />
      </g>
      {/* Flame hint when ready */}
      <circle cx={12} cy={0} r={5} fill="#ff6d00" opacity={0.6} />
    </g>
  );
}

function Ball({ x, y, phase }) {
  if (phase === 'idle') return null;
  const px = CANNON_X + x * SCALE;
  const py = GROUND_Y - y * SCALE;
  return (
    <g transform={`translate(${px}, ${py})`}>
      <circle r={14} fill="#e0e0e0" stroke="#999" strokeWidth={2}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
      <circle cx={-4} cy={-4} r={4} fill="rgba(0,0,0,0.7)" />
      <circle cx={4}  cy={-4} r={4} fill="rgba(0,0,0,0.7)" />
      <path d="M -4 3 Q 0 6 4 3" stroke="rgba(0,0,0,0.7)" strokeWidth={2} fill="none" />
    </g>
  );
}

function Ground() {
  return (
    <>
      <rect x={0} y={GROUND_Y + 2} width={CANVAS_W} height={50} fill="#4a3728" />
      <rect x={0} y={GROUND_Y} width={CANVAS_W} height={4} fill="#6b5040" />
      {/* Distance markers */}
      {Array.from({ length: 15 }, (_, i) => (i + 1) * 10).map(d => {
        const px = CANNON_X + d * SCALE;
        if (px > CANVAS_W) return null;
        return (
          <g key={d}>
            <line x1={px} y1={GROUND_Y} x2={px} y2={GROUND_Y + 12} stroke="#8b6a55" strokeWidth={1} />
            <text x={px} y={GROUND_Y + 24} textAnchor="middle" fontSize={9} fill="#a08060">{d}m</text>
          </g>
        );
      })}
    </>
  );
}

function LandingMarker({ x, distance, user }) {
  if (!x || !distance) return null;
  const px = CANNON_X + x * SCALE;
  return (
    <g>
      <line x1={px} y1={GROUND_Y - 30} x2={px} y2={GROUND_Y + 2} stroke="#ffd600" strokeWidth={2} strokeDasharray="4,3" />
      <rect x={px - 45} y={GROUND_Y - 50} width={90} height={26} rx={6} fill="rgba(0,0,0,0.7)" stroke="#ffd600" strokeWidth={1.5} />
      <text x={px} y={GROUND_Y - 31} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#ffd600">{distance}m {user ? `@${user}` : ''}</text>
    </g>
  );
}

export default function CannonGame({ engine, overlayUrl }) {
  const { phase, angle, ballPos, distance, topDistance,
          activeBoost, boostQueue, lastShooter, particles } = engine;

  const trailPoints = useMemo(() => {
    if (phase !== 'launched') return '';
    return `${CANNON_X},${GROUND_Y}`;
  }, [phase]);

  return (
    <div className="flex flex-col gap-3">
      {/* Game canvas */}
      <div className="relative bg-gradient-to-b from-sky-400 to-sky-300 rounded-2xl overflow-hidden border-2 border-[#1e2240]" style={{ height: CANVAS_H }}>
        <svg width="100%" height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="xMidYMid meet">
          {/* Sky gradient */}
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#87CEEB" />
              <stop offset="100%" stopColor="#b0e0ff" />
            </linearGradient>
          </defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#sky)" />

          {/* Clouds */}
          {[[120,60],[280,40],[480,70],[700,50]].map(([cx,cy],i) => (
            <g key={i} transform={`translate(${cx},${cy})`} opacity={0.8}>
              <ellipse cx={0} cy={0} rx={30} ry={18} fill="white" />
              <ellipse cx={20} cy={-5} rx={22} ry={14} fill="white" />
              <ellipse cx={-18} cy={-4} rx={20} ry={12} fill="white" />
            </g>
          ))}

          <Ground />
          <Cannon angle={angle} />

          {/* Trajectory arc preview when idle */}
          {phase === 'idle' && (() => {
            const pts = [];
            const rad = (angle * Math.PI) / 180;
            const v0 = engine.power;
            for (let t = 0; t < 8; t += 0.1) {
              const x = v0 * Math.cos(rad) * t;
              const y = v0 * Math.sin(rad) * t - 0.5 * 9.8 * t * t;
              if (y < 0) break;
              pts.push(`${CANNON_X + x * SCALE},${GROUND_Y - y * SCALE}`);
            }
            return pts.length > 1 ? (
              <polyline points={pts.join(' ')} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeDasharray="6,4" />
            ) : null;
          })()}

          <Ball x={ballPos.x} y={ballPos.y} phase={phase} />

          {phase === 'landed' && (
            <LandingMarker x={ballPos.x} distance={distance} user={lastShooter} />
          )}

          {/* Particles on landing */}
          {particles.map(p => {
            const rad = (p.angle * Math.PI) / 180;
            return (
              <circle key={p.id}
                cx={CANNON_X + p.x * SCALE + Math.cos(rad) * p.speed * 20}
                cy={GROUND_Y + Math.sin(rad) * p.speed * 20 - 10}
                r={4} fill="#ffd600" opacity={0.8} />
            );
          })}
        </svg>

        {/* Active boost pop */}
        {activeBoost && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="px-6 py-3 rounded-2xl font-black text-xl text-black text-center animate-bounce"
              style={{ background: activeBoost.color, boxShadow: `0 0 30px ${activeBoost.color}` }}>
              {activeBoost.emoji} {activeBoost.label}
              {activeBoost.user && <div className="text-xs opacity-70 font-bold">from @{activeBoost.user}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">Last Shot</div>
          <div className="text-2xl font-black text-cyan-400 font-mono">{distance ? `${distance}m` : '—'}</div>
        </div>
        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">Top Distance</div>
          <div className="text-2xl font-black text-yellow-400 font-mono">{topDistance ? `${topDistance}m` : '—'}</div>
        </div>
        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">Boost</div>
          <div className="text-2xl font-black font-mono" style={{ color: activeBoost?.color ?? '#555' }}>
            {engine.activePowerMultiplier > 1 ? `x${engine.activePowerMultiplier.toFixed(1)}` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
