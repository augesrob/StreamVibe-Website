/**
 * CannonGame v2 — Scrolling camera, bombs, power pickups, bounce physics
 * Camera follows ball; cannon stays at world x=0
 */
import React, { useRef, useEffect } from 'react';

const SCALE    = 5;
const CANVAS_W = 860;
const CANVAS_H = 340;
const CANNON_WX = 0;        // cannon world-x (pixels)
const GROUND_Y  = CANVAS_H - 70;
const BALL_R    = 14;

// ── Sub-components ────────────────────────────────────────────────────────

function Cannon({ angle, phase }) {
  const wobble = phase === 'aiming';
  return (
    <g>
      {/* Wheels */}
      <circle cx={8}  cy={GROUND_Y + 10} r={20} fill="#2a1a0a" stroke="#5a3a1a" strokeWidth={3} />
      <circle cx={46} cy={GROUND_Y + 10} r={20} fill="#2a1a0a" stroke="#5a3a1a" strokeWidth={3} />
      <circle cx={8}  cy={GROUND_Y + 10} r={7}  fill="#4a2a0a" />
      <circle cx={46} cy={GROUND_Y + 10} r={7}  fill="#4a2a0a" />
      {/* Body */}
      <rect x={-5} y={GROUND_Y - 6} width={62} height={22} rx={5} fill="#1a1008" stroke="#3a2808" strokeWidth={2} />
      {/* Barrel — rotates around pivot */}
      <g transform={`rotate(${-angle}, 28, ${GROUND_Y - 2})`}>
        <rect x={20} y={GROUND_Y - 14} width={68} height={24} rx={12} fill="#111" stroke="#444" strokeWidth={2} />
        <rect x={78} y={GROUND_Y - 16} width={14} height={28} rx={5} fill="#0a0a0a" stroke="#333" strokeWidth={2} />
        {/* Fuse on top */}
        {phase !== 'flying' && phase !== 'bouncing' && phase !== 'rolling' && (
          <g>
            <path d="M 28 ${GROUND_Y - 14} Q 34 ${GROUND_Y - 28} 42 ${GROUND_Y - 20}" stroke="#8B4513" strokeWidth={2} fill="none" />
            <circle cx={42} cy={GROUND_Y - 20} r={4} fill={phase === 'aiming' ? '#ff4400' : '#cc3300'} opacity={phase === 'aiming' ? 0.9 : 0.6}>
              {phase === 'aiming' && <animate attributeName="opacity" values="0.4;1;0.4" dur="0.3s" repeatCount="indefinite" />}
            </circle>
          </g>
        )}
      </g>
      {/* Muzzle flash when firing */}
      {phase === 'flying' && (
        <g transform={`rotate(${-angle}, 28, ${GROUND_Y - 2})`}>
          <ellipse cx={96} cy={GROUND_Y + 0} rx={16} ry={10} fill="#ff6600" opacity={0.8} />
          <ellipse cx={96} cy={GROUND_Y + 0} rx={10} ry={6}  fill="#ffcc00" opacity={0.9} />
        </g>
      )}
    </g>
  );
}

function Ball({ wx, wy, phase }) {
  if (phase === 'idle' || phase === 'aiming') return null;
  const px = wx;
  const py = GROUND_Y - wy;
  const rolling = phase === 'rolling';
  return (
    <g transform={`translate(${px}, ${py})`}>
      <circle r={BALL_R} fill="#d4d4d4" stroke="#888" strokeWidth={2}
        style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.6))' }} />
      <circle cx={-4} cy={-4} r={4.5} fill="rgba(0,0,0,0.75)" />
      <circle cx={5}  cy={-4} r={4.5} fill="rgba(0,0,0,0.75)" />
      <path d="M -4 3 Q 0 7 5 3" stroke="rgba(0,0,0,0.75)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {/* Speed lines when flying fast */}
      {(phase === 'flying') && (
        <>
          <line x1={-BALL_R} y1={-3} x2={-BALL_R - 20} y2={-3} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
          <line x1={-BALL_R} y1={4}  x2={-BALL_R - 14} y2={4}  stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
        </>
      )}
    </g>
  );
}

function Bomb({ wx, active }) {
  if (!active) return null;
  const px = wx;
  const py = GROUND_Y - 18;
  return (
    <g transform={`translate(${px}, ${py})`}>
      {/* Shadow */}
      <ellipse cx={0} cy={20} rx={14} ry={5} fill="rgba(0,0,0,0.3)" />
      {/* Body */}
      <circle r={15} fill="#1a1a1a" stroke="#333" strokeWidth={2} />
      <circle r={12} fill="#222" />
      {/* Shine */}
      <ellipse cx={-4} cy={-5} rx={4} ry={3} fill="rgba(255,255,255,0.15)" />
      {/* Fuse */}
      <path d="M 4 -15 Q 12 -24 8 -30" stroke="#8B4513" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <circle cx={8} cy={-30} r={3} fill="#ff6600">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="0.6s" repeatCount="indefinite" />
      </circle>
      {/* Label */}
      <text x={0} y={5} textAnchor="middle" fontSize={13} fontWeight="900" fill="#ff4400">💣</text>
    </g>
  );
}

function PowerPickup({ wx, active }) {
  if (!active) return null;
  const px = wx;
  const py = GROUND_Y - 18;
  return (
    <g transform={`translate(${px}, ${py})`}>
      <ellipse cx={0} cy={20} rx={12} ry={4} fill="rgba(0,0,0,0.25)" />
      <rect x={-13} y={-15} width={26} height={26} rx={8}
        fill="#1a3a00" stroke="#00cc44" strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 6px rgba(0,200,60,0.5))' }} />
      <text x={0} y={6} textAnchor="middle" fontSize={15} fontWeight="900">⚡</text>
    </g>
  );
}

function Explosion({ wx, wy, color }) {
  const px = wx;
  const py = GROUND_Y - wy;
  return (
    <g transform={`translate(${px}, ${py})`}>
      {[0,60,120,180,240,300].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        const ex = Math.cos(r) * 30;
        const ey = Math.sin(r) * 30;
        return <ellipse key={i} cx={ex} cy={ey} rx={12} ry={8} fill={color} opacity={0.85}
          transform={`rotate(${deg})`} />;
      })}
      <circle r={18} fill={color} opacity={0.9} />
      <circle r={10} fill="#fff" opacity={0.8} />
    </g>
  );
}

function Ground({ cameraX }) {
  // Render ground that spans the visible area + ahead
  const startM = Math.max(0, Math.floor(cameraX / SCALE / 10) * 10);
  const markers = [];
  for (let m = startM; m <= startM + 200; m += 10) {
    const wx = m * SCALE;
    markers.push(
      <g key={m}>
        <line x1={wx} y1={GROUND_Y} x2={wx} y2={GROUND_Y + 14} stroke="#7a5a3a" strokeWidth={1} />
        <text x={wx} y={GROUND_Y + 26} textAnchor="middle" fontSize={10} fill="#a07850">{m}m</text>
      </g>
    );
  }
  const totalW = (startM + 300) * SCALE;
  return (
    <>
      <rect x={0} y={GROUND_Y + 2} width={totalW} height={70} fill="#3a2818" />
      <rect x={0} y={GROUND_Y - 1} width={totalW} height={5}  fill="#5a3a20" />
      {/* Wood plank texture lines */}
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1={0} y1={GROUND_Y + 10 + i * 8} x2={totalW} y2={GROUND_Y + 10 + i * 8}
          stroke="rgba(0,0,0,0.1)" strokeWidth={1} />
      ))}
      {markers}
    </>
  );
}

function LandingFlag({ wx, distance, user }) {
  if (!distance) return null;
  return (
    <g transform={`translate(${wx}, 0)`}>
      <line x1={0} y1={GROUND_Y - 55} x2={0} y2={GROUND_Y} stroke="#ffd600" strokeWidth={2.5} strokeDasharray="5,4" />
      <rect x={-54} y={GROUND_Y - 78} width={108} height={28} rx={8} fill="rgba(0,0,0,0.8)" stroke="#ffd600" strokeWidth={2} />
      <text x={0} y={GROUND_Y - 59} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#ffd600">
        {distance}m {user ? `@${user}` : ''}
      </text>
    </g>
  );
}

// ── Main game canvas ────────────────────────────────────────────────────────
export default function CannonGame({ engine }) {
  const { phase, angle, ballPos, cameraX, distance, topDistance,
          activeBoost, worldObjects, explosions, lastShooter } = engine;

  // Viewport: camera shifts the inner world group
  const camOff = cameraX;

  // Trajectory preview
  const trajectoryPoints = [];
  if (phase === 'idle' || phase === 'aiming') {
    const rad = (angle * Math.PI) / 180;
    const spd = 160 * (engine.activePowerMultiplier || 1);
    const dt  = 0.05;
    let tx = 0, ty = 0, tvx = spd * Math.cos(rad), tvy = spd * Math.sin(rad);
    for (let i = 0; i < 200; i++) {
      tvy -= 320 * dt;
      tx  += tvx * dt;
      ty  += tvy * dt;
      if (ty < 0) break;
      trajectoryPoints.push(`${CANNON_WX + tx},${GROUND_Y - ty}`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main game SVG */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#1e2240]"
        style={{ height: CANVAS_H, background: 'linear-gradient(180deg, #87ceeb 0%, #c8e8ff 70%, #d4b896 100%)' }}>
        <svg width="100%" height={CANVAS_H}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          preserveAspectRatio="xMidYMid meet">

          {/* Sky */}
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5bbfea" />
              <stop offset="60%" stopColor="#a8d8f0" />
              <stop offset="100%" stopColor="#c8e0d0" />
            </linearGradient>
          </defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#skyGrad)" />

          {/* Static clouds in viewport space */}
          {[[120,45],[260,30],[430,55],[600,40],[760,50]].map(([cx,cy],i) => (
            <g key={i} transform={`translate(${cx},${cy})`} opacity={0.75}>
              <ellipse cx={0} cy={0} rx={32} ry={19} fill="white" />
              <ellipse cx={22} cy={-6} rx={24} ry={15} fill="white" />
              <ellipse cx={-20} cy={-5} rx={22} ry={13} fill="white" />
            </g>
          ))}

          {/* Scrolling world group */}
          <g transform={`translate(${-camOff}, 0)`}>
            <Ground cameraX={cameraX} />
            <Cannon angle={angle} phase={phase} />

            {/* Trajectory arc */}
            {trajectoryPoints.length > 1 && (
              <polyline points={trajectoryPoints.join(' ')}
                fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2}
                strokeDasharray="8,5" />
            )}

            {/* World objects */}
            {worldObjects.map(obj =>
              obj.type === 'bomb'
                ? <Bomb  key={obj.id} wx={obj.x} active={obj.active} />
                : <PowerPickup key={obj.id} wx={obj.x} active={obj.active} />
            )}

            {/* Explosions */}
            {explosions.map(e => (
              <Explosion key={e.id} wx={e.x} wy={e.y} color={e.color} />
            ))}

            {/* Ball */}
            <Ball wx={ballPos.x} wy={ballPos.y} phase={phase} />

            {/* Landing flag */}
            {phase === 'landed' && (
              <LandingFlag wx={ballPos.x} distance={distance} user={lastShooter} />
            )}
          </g>

          {/* HUD — distance counter fixed in viewport */}
          {(phase === 'flying' || phase === 'bouncing' || phase === 'rolling') && (
            <g>
              <rect x={CANVAS_W - 120} y={10} width={110} height={38} rx={8}
                fill="rgba(0,0,0,0.65)" stroke="rgba(255,215,0,0.5)" strokeWidth={1.5} />
              <text x={CANVAS_W - 65} y={35} textAnchor="middle" fontSize={20}
                fontWeight="900" fill="#ffd700" fontFamily="monospace">
                {distance}m
              </text>
            </g>
          )}

          {/* Aiming indicator */}
          {phase === 'aiming' && (
            <g>
              <rect x={CANVAS_W/2 - 90} y={20} width={180} height={38} rx={10}
                fill="rgba(255,100,0,0.85)" stroke="#ff6600" strokeWidth={2} />
              <text x={CANVAS_W/2} y={44} textAnchor="middle" fontSize={16}
                fontWeight="900" fill="white">🎯 AIMING...</text>
            </g>
          )}
        </svg>

        {/* Boost pop overlay */}
        {activeBoost && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="px-5 py-2.5 rounded-2xl font-black text-lg text-black text-center"
              style={{ background: activeBoost.color, boxShadow: `0 0 28px ${activeBoost.color}99`,
                animation: 'pulse 0.4s ease infinite alternate' }}>
              {activeBoost.emoji} {activeBoost.label}
              {activeBoost.user && <div className="text-xs opacity-75">from @{activeBoost.user}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          ['Last Shot',   distance ? `${distance}m` : '—',       'text-cyan-400'],
          ['Top Record',  topDistance ? `${topDistance}m` : '—', 'text-yellow-400'],
          ['Phase',       phase.toUpperCase(),                    'text-orange-400'],
          ['Multiplier',  engine.activePowerMultiplier > 1
            ? `×${engine.activePowerMultiplier.toFixed(1)}` : '—',  'text-green-400'],
        ].map(([label, val, cls]) => (
          <div key={label} className="bg-[#151828] border border-[#1e2240] rounded-xl p-2 text-center">
            <div className="text-[9px] text-gray-600 uppercase tracking-widest">{label}</div>
            <div className={`text-lg font-black font-mono ${cls}`}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
