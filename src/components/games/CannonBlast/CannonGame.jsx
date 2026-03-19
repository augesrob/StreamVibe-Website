/**
 * CannonGame v3 — Ball Guys style
 * Shows chest picker before game, then rolling game canvas with camera follow
 */
import React from 'react';

const CANVAS_W = 860;
const CANVAS_H = 280;
const SHELF_Y  = CANVAS_H - 60; // ground/shelf level
const BALL_R   = 16;
const CANNON_X = 60;

// ── Chest picker ─────────────────────────────────────────────────────────────
const TYPE_COLOR = { launch: '#00e5ff', bomb: '#ff4400', power: '#ffd700' };
const TYPE_LABEL = { launch: '🚀 Launch', bomb: '💣 Bombs', power: '⚡ Power' };

function ChestPicker({ chests, pickedChests, onPick, multipliers, phase }) {
  const remaining = 3 - pickedChests.length;
  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-[#0d0e1a] rounded-2xl border-2 border-[#1e2240]">
      {/* Cannon decorative */}
      <div className="text-5xl">💥</div>

      {/* Current multipliers panel */}
      <div className="w-full max-w-xs bg-[#1a1830] border border-[#2a2840] rounded-xl p-3">
        {[['launch', multipliers.launch], ['bomb', multipliers.bomb], ['power', multipliers.power]].map(([t, v]) => (
          <div key={t} className="flex items-center gap-3 py-1.5 border-b border-[#2a2840] last:border-0">
            <span className="text-lg w-8">{TYPE_LABEL[t].split(' ')[0]}</span>
            <span className="text-sm font-bold text-gray-300 flex-1">{TYPE_LABEL[t].split(' ')[1]}</span>
            <span className="font-black text-xl font-mono" style={{ color: TYPE_COLOR[t] }}>
              {v === 1 ? 'X ?' : `${v}x`}
            </span>
          </div>
        ))}
      </div>

      {/* Instruction */}
      <div className="text-center">
        <p className="font-black text-yellow-400 text-lg tracking-wide">
          {remaining > 0 ? `PICK ${remaining} CHEST${remaining > 1 ? 'S' : ''}` : '🎯 READY TO FIRE!'}
        </p>
      </div>

      {/* 3×3 chest grid */}
      <div className="grid grid-cols-3 gap-3">
        {chests.map(chest => {
          const picked = pickedChests.includes(chest.id);
          return (
            <button key={chest.id}
              onClick={() => !picked && remaining > 0 && onPick(chest.id)}
              disabled={picked || remaining === 0}
              className="relative w-20 h-20 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:cursor-default"
              style={{
                background: picked
                  ? `linear-gradient(135deg, ${TYPE_COLOR[chest.type]}33, ${TYPE_COLOR[chest.type]}11)`
                  : 'linear-gradient(135deg, #6b3a10, #8b5a20)',
                border: picked
                  ? `2px solid ${TYPE_COLOR[chest.type]}`
                  : '2px solid #a07040',
                boxShadow: picked ? `0 0 12px ${TYPE_COLOR[chest.type]}66` : '0 3px 0 #4a2a08',
              }}>
              {chest.revealed ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-xl">{TYPE_LABEL[chest.type].split(' ')[0]}</div>
                  <div className="font-black text-lg font-mono" style={{ color: TYPE_COLOR[chest.type] }}>
                    {chest.prize}x
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <div className="text-3xl">📦</div>
                  <div className="w-8 h-1 rounded-full bg-yellow-600/50" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Cannon SVG component ───────────────────────────────────────────────────
function Cannon({ angle, phase }) {
  const isAiming = phase === 'aiming';
  return (
    <g transform={`translate(${CANNON_X}, ${SHELF_Y})`}>
      {/* Wheels */}
      <circle cx={0}  cy={4} r={18} fill="#2a1a08" stroke="#5a3a10" strokeWidth={2.5} />
      <circle cx={36} cy={4} r={18} fill="#2a1a08" stroke="#5a3a10" strokeWidth={2.5} />
      <circle cx={0}  cy={4} r={6}  fill="#4a2a10" />
      <circle cx={36} cy={4} r={6}  fill="#4a2a10" />
      {/* Body */}
      <rect x={-12} y={-10} width={62} height={20} rx={5} fill="#1a1008" stroke="#3a2008" strokeWidth={2} />
      {/* Barrel rotates around pivot */}
      <g transform={`rotate(${-angle}, 18, -4)`}>
        <rect x={12} y={-12} width={72} height={22} rx={11} fill="#111" stroke="#444" strokeWidth={2} />
        <rect x={76} y={-14} width={12} height={26} rx={5} fill="#0a0a0a" stroke="#333" strokeWidth={2} />
        {/* Fuse */}
        {phase !== 'rolling' && (
          <>
            <path d="M 18 -12 Q 24 -26 30 -20" stroke="#8B4513" strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <circle cx={30} cy={-20} r={4} fill={isAiming ? '#ff6600' : '#cc4400'}>
              {isAiming && <animate attributeName="r" values="3;5;3" dur="0.25s" repeatCount="indefinite" />}
            </circle>
          </>
        )}
      </g>
      {/* Muzzle flash on fire */}
      {phase === 'rolling' && (
        <g transform={`rotate(${-angle}, 18, -4)`}>
          <ellipse cx={95} cy={-2} rx={18} ry={12} fill="#ff6600" opacity={0.85} />
          <ellipse cx={95} cy={-2} rx={11} ry={7}  fill="#ffcc00" opacity={0.95} />
        </g>
      )}
    </g>
  );
}

// ── Ball ───────────────────────────────────────────────────────────────────
function Ball({ wx, phase }) {
  if (phase === 'idle' || phase === 'chest_pick' || phase === 'aiming') return null;
  const py = SHELF_Y - BALL_R;
  return (
    <g transform={`translate(${wx}, ${py})`}>
      <circle r={BALL_R} fill="#d8d8d8" stroke="#999" strokeWidth={2}
        style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.6))' }} />
      <circle cx={-5} cy={-5} r={4.5} fill="rgba(0,0,0,0.75)" />
      <circle cx={5}  cy={-5} r={4.5} fill="rgba(0,0,0,0.75)" />
      <path d="M -5 3 Q 0 7 5 3" stroke="rgba(0,0,0,0.75)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {/* Speed lines */}
      {phase === 'rolling' && (
        <>
          <line x1={-BALL_R - 2} y1={-3} x2={-BALL_R - 26} y2={-3} stroke="rgba(255,255,255,0.5)" strokeWidth={2.5} />
          <line x1={-BALL_R - 2} y1={4}  x2={-BALL_R - 18} y2={4}  stroke="rgba(255,255,255,0.35}" strokeWidth={2} />
        </>
      )}
    </g>
  );
}

// ── Bomb ───────────────────────────────────────────────────────────────────
function Bomb({ wx, active }) {
  if (!active) return null;
  const py = SHELF_Y - 18;
  return (
    <g transform={`translate(${wx}, ${py})`}>
      <ellipse cx={0} cy={20} rx={14} ry={5} fill="rgba(0,0,0,0.3)" />
      <circle r={15} fill="#1a1a1a" stroke="#444" strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 6px rgba(255,80,0,0.4))' }} />
      <circle r={11} fill="#2a2a2a" />
      <ellipse cx={-4} cy={-5} rx={4} ry={3} fill="rgba(255,255,255,0.12)" />
      <path d="M 5 -15 Q 12 -26 8 -32" stroke="#8B4513" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <circle cx={8} cy={-32} r={3} fill="#ff6600">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" />
      </circle>
      <text x={0} y={5} textAnchor="middle" fontSize={14}>💣</text>
    </g>
  );
}

// ── Power pickup ───────────────────────────────────────────────────────────
function PowerPickup({ wx, active }) {
  if (!active) return null;
  const py = SHELF_Y - 18;
  return (
    <g transform={`translate(${wx}, ${py})`}>
      <ellipse cx={0} cy={20} rx={12} ry={4} fill="rgba(0,0,0,0.25)" />
      <rect x={-14} y={-15} width={28} height={28} rx={8}
        fill="#0a2a00" stroke="#00cc44" strokeWidth={2}
        style={{ filter: 'drop-shadow(0 0 8px rgba(0,200,60,0.5))' }} />
      <text x={0} y={7} textAnchor="middle" fontSize={16}>⚡</text>
    </g>
  );
}

// ── Shelf / ground ─────────────────────────────────────────────────────────
function Shelf({ totalWidth }) {
  const markers = [];
  for (let m = 0; m <= totalWidth / 10 + 50; m += 10) {
    const wx = m * 10;
    markers.push(
      <g key={m}>
        <line x1={wx} y1={SHELF_Y} x2={wx} y2={SHELF_Y + 14} stroke="#7a5a30" strokeWidth={1} />
        <text x={wx} y={SHELF_Y + 26} textAnchor="middle" fontSize={10} fill="#a07840">{m}m</text>
      </g>
    );
  }
  const totalPx = (totalWidth / 10 + 60) * 10;
  return (
    <>
      {/* Wooden shelf */}
      <rect x={-40} y={SHELF_Y + 2} width={totalPx + 100} height={58} fill="#3a2010" />
      <rect x={-40} y={SHELF_Y - 1} width={totalPx + 100} height={6}  fill="#6a4020" />
      {/* Plank lines */}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1={-40} y1={SHELF_Y + 10 + i * 8} x2={totalPx + 100} y2={SHELF_Y + 10 + i * 8}
          stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      ))}
      {/* Vertical planks */}
      {Array.from({ length: Math.ceil((totalPx + 140) / 120) }, (_, i) => (
        <line key={`v${i}`} x1={-40 + i * 120} y1={SHELF_Y + 2} x2={-40 + i * 120} y2={SHELF_Y + 60}
          stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
      ))}
      {markers}
    </>
  );
}

// ── Landing flag ───────────────────────────────────────────────────────────
function LandingFlag({ wx, distance, user }) {
  if (!distance) return null;
  return (
    <g transform={`translate(${wx}, 0)`}>
      <line x1={0} y1={SHELF_Y - 50} x2={0} y2={SHELF_Y} stroke="#ffd600" strokeWidth={2.5} strokeDasharray="5,4" />
      <rect x={-56} y={SHELF_Y - 74} width={112} height={28} rx={8}
        fill="rgba(0,0,0,0.85)" stroke="#ffd600" strokeWidth={2} />
      <text x={0} y={SHELF_Y - 55} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#ffd600">
        {distance}m {user ? `@${user}` : ''}
      </text>
    </g>
  );
}

// ── Explosion ──────────────────────────────────────────────────────────────
function Explosion({ wx, color }) {
  const py = SHELF_Y - 20;
  return (
    <g transform={`translate(${wx}, ${py})`}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        return <ellipse key={i} cx={Math.cos(r) * 22} cy={Math.sin(r) * 22}
          rx={10} ry={7} fill={color} opacity={0.8} transform={`rotate(${deg})`} />;
      })}
      <circle r={16} fill={color} opacity={0.9} />
      <circle r={9}  fill="#fff" opacity={0.75} />
    </g>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function CannonGame({ engine }) {
  const { phase, angle, ballX, cameraX, distance, topDistance,
          activeBoost, worldObjects, explosions, lastShooter,
          chests, pickedChests, pickChest, multipliers } = engine;

  const totalW = Math.max(ballX + 2000, 5000);

  if (phase === 'chest_pick' || (phase === 'idle' && chests.length > 0)) {
    return (
      <div className="flex flex-col gap-3">
        <ChestPicker chests={chests} pickedChests={pickedChests}
          onPick={pickChest} multipliers={multipliers} phase={phase} />
        <StatsRow engine={engine} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Game canvas */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#1e2240]"
        style={{ height: CANVAS_H, background: 'linear-gradient(180deg,#5bbfea 0%,#a8d8f0 55%,#c8e0d0 100%)' }}>
        <svg width="100%" height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          preserveAspectRatio="xMidYMid meet">

          {/* Sky */}
          <defs>
            <linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5bbfea" />
              <stop offset="100%" stopColor="#b8ddf0" />
            </linearGradient>
          </defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#skyg)" />

          {/* Clouds (fixed in viewport) */}
          {[[80,38],[200,22],[380,42],[560,28],[720,38]].map(([cx,cy],i) => (
            <g key={i} transform={`translate(${cx},${cy})`} opacity={0.7}>
              <ellipse cx={0} cy={0} rx={30} ry={18} fill="white" />
              <ellipse cx={22} cy={-5} rx={22} ry={14} fill="white" />
              <ellipse cx={-20} cy={-4} rx={20} ry={12} fill="white" />
            </g>
          ))}

          {/* Scrollable world */}
          <g transform={`translate(${-cameraX}, 0)`}>
            <Shelf totalWidth={totalW} />
            <Cannon angle={angle} phase={phase} />

            {worldObjects.map(obj =>
              obj.type === 'bomb'
                ? <Bomb  key={obj.id} wx={obj.x} active={obj.active} />
                : <PowerPickup key={obj.id} wx={obj.x} active={obj.active} />
            )}

            {explosions.map(e => <Explosion key={e.id} wx={e.x} color={e.color} />)}

            <Ball wx={ballX} phase={phase} />

            {phase === 'landed' && (
              <LandingFlag wx={ballX} distance={distance} user={lastShooter} />
            )}
          </g>

          {/* HUD: live distance */}
          {(phase === 'rolling') && (
            <g>
              <rect x={CANVAS_W - 124} y={10} width={114} height={40} rx={9}
                fill="rgba(0,0,0,0.7)" stroke="rgba(255,215,0,0.5)" strokeWidth={1.5} />
              <text x={CANVAS_W - 67} y={37} textAnchor="middle" fontSize={22}
                fontWeight="900" fill="#ffd700" fontFamily="monospace">
                {distance}m
              </text>
            </g>
          )}

          {/* Aiming HUD */}
          {phase === 'aiming' && (
            <g>
              <rect x={CANVAS_W/2 - 95} y={16} width={190} height={40} rx={10}
                fill="rgba(255,100,0,0.9)" stroke="#ff6600" strokeWidth={2} />
              <text x={CANVAS_W/2} y={41} textAnchor="middle" fontSize={17}
                fontWeight="900" fill="white">🎯 AIMING...</text>
            </g>
          )}
        </svg>

        {/* Boost pop */}
        {activeBoost && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="px-5 py-2.5 rounded-2xl font-black text-lg text-black text-center animate-bounce"
              style={{ background: activeBoost.color, boxShadow: `0 0 28px ${activeBoost.color}99` }}>
              {activeBoost.emoji} {activeBoost.label}
              {activeBoost.user && <div className="text-xs opacity-75">from @{activeBoost.user}</div>}
            </div>
          </div>
        )}
      </div>

      <StatsRow engine={engine} />
    </div>
  );
}

function StatsRow({ engine }) {
  const { distance, topDistance, phase, multipliers } = engine;
  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        ['Last Shot',   distance ? `${distance}m` : '—',        'text-cyan-400'],
        ['Record',      topDistance ? `${topDistance}m` : '—',  'text-yellow-400'],
        ['Launch',      `×${multipliers.launch.toFixed(1)}`,     'text-blue-400'],
        ['Bombs',       `×${multipliers.bomb.toFixed(0)}`,       'text-red-400'],
      ].map(([label, val, cls]) => (
        <div key={label} className="bg-[#151828] border border-[#1e2240] rounded-xl p-2 text-center">
          <div className="text-[9px] text-gray-600 uppercase tracking-widest">{label}</div>
          <div className={`text-lg font-black font-mono ${cls}`}>{val}</div>
        </div>
      ))}
    </div>
  );
}
