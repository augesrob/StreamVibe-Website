/**
 * CannonGame v4 — "Cannon Climb"
 * Inclined slope, player ball rolls UP, enemy cannons fire DOWN.
 * Camera follows ball up the slope.
 * SVG coordinate system: slope runs bottom-left to top-right.
 */
import React, { useMemo } from 'react';
import { SLOPE_ANGLE_DEG } from '@/hooks/useCannonEngine';

const CANVAS_W   = 860;
const CANVAS_H   = 340;
const SLOPE_RAD  = (SLOPE_ANGLE_DEG * Math.PI) / 180;
const SLOPE_RISE = Math.sin(SLOPE_RAD); // y per px along slope
const SLOPE_RUN  = Math.cos(SLOPE_RAD); // x per px along slope
const SLOPE_ORIG_X = 60;                // slope starts here in canvas
const SLOPE_ORIG_Y = CANVAS_H - 40;    // slope origin y in canvas

// Convert slope-distance + perpendicular offset → canvas x,y
function slopeToCanvas(sx, py, camOffset) {
  const wx = SLOPE_ORIG_X + (sx - camOffset) * SLOPE_RUN - py * SLOPE_RISE;
  const wy = SLOPE_ORIG_Y - (sx - camOffset) * SLOPE_RISE - py * SLOPE_RUN;
  return { cx: wx, cy: wy };
}

// Draw the slope surface
function Slope({ camOffset }) {
  const TOTAL = 6000;
  const points = [];
  // Bottom edge of slope (rendered surface)
  for (let s = -200; s <= TOTAL; s += 50) {
    const { cx, cy } = slopeToCanvas(s, 0, camOffset);
    points.push(`${cx},${cy}`);
  }
  // Below the surface (fill downward)
  const last = slopeToCanvas(TOTAL, 0, camOffset);
  const first = slopeToCanvas(-200, 0, camOffset);

  const surfacePts = points.join(' ');

  // Distance markers every 100px (=10m)
  const markers = [];
  for (let m = 0; m <= 400; m += 10) {
    const s = m * 10;
    const { cx, cy } = slopeToCanvas(s, 0, camOffset);
    if (cx < -20 || cx > CANVAS_W + 20) continue;
    markers.push(
      <g key={m}>
        <line
          x1={cx - SLOPE_RISE * 8} y1={cy - SLOPE_RUN * 8}
          x2={cx + SLOPE_RISE * 8} y2={cy + SLOPE_RUN * 8}
          stroke="#7a5a30" strokeWidth={1.5} />
        <text x={cx - SLOPE_RISE * 18} y={cy + SLOPE_RUN * 10 + 4}
          textAnchor="middle" fontSize={9} fill="#a07840">{m}m</text>
      </g>
    );
  }

  return (
    <>
      {/* Slope fill */}
      <polygon
        points={`${surfacePts} ${last.cx},${CANVAS_H + 20} ${first.cx},${CANVAS_H + 20}`}
        fill="#3a2010" />
      {/* Slope surface */}
      <polyline points={surfacePts} fill="none" stroke="#6a4020" strokeWidth={5} />
      {/* Grass top edge */}
      <polyline points={surfacePts} fill="none" stroke="#4a7a20" strokeWidth={3} />
      {markers}
    </>
  );
}

// ── Cannon (enemy) ────────────────────────────────────────────────────────
function EnemyCannon({ sx, camOffset, telegraph, type }) {
  const { cx, cy } = slopeToCanvas(sx, 0, camOffset);
  if (cx < -60 || cx > CANVAS_W + 60) return null;
  const isTelegraph = telegraph > 0;
  const typeColor = { standard: '#cc3300', bouncy: '#7c4dff', explosive: '#ff6d00' }[type] ?? '#cc3300';

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Telegraph flash */}
      {isTelegraph && (
        <circle r={28} fill={typeColor} opacity={0.25}>
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="0.4s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Mount on slope */}
      <rect x={-18} y={-8} width={36} height={14} rx={4}
        fill="#1a1008" stroke="#3a2008" strokeWidth={2}
        transform={`rotate(${-SLOPE_ANGLE_DEG})`} />
      {/* Barrel pointing DOWN the slope */}
      <g transform={`rotate(${180 + SLOPE_ANGLE_DEG})`}>
        <rect x={0} y={-8} width={44} height={16} rx={8}
          fill="#111" stroke="#444" strokeWidth={2} />
        {isTelegraph && (
          <ellipse cx={48} cy={0} rx={12} ry={8} fill={typeColor} opacity={0.9}>
            <animate attributeName="rx" values="8;16;8" dur="0.3s" repeatCount="indefinite" />
          </ellipse>
        )}
      </g>
      {/* Type indicator */}
      <text x={0} y={-22} textAnchor="middle" fontSize={12}>
        {type === 'explosive' ? '💥' : type === 'bouncy' ? '🟣' : '🔴'}
      </text>
    </g>
  );
}

// ── Safe zone alcove ──────────────────────────────────────────────────────
function SafeZone({ sx, camOffset }) {
  const { cx, cy } = slopeToCanvas(sx, 0, camOffset);
  if (cx < -80 || cx > CANVAS_W + 80) return null;
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Raised bumper/alcove */}
      <ellipse cx={0} cy={-8} rx={22} ry={12} fill="#1a3a00" stroke="#00cc44" strokeWidth={2} opacity={0.85} />
      <text x={0} y={-4} textAnchor="middle" fontSize={10} fill="#00cc44">🛡</text>
    </g>
  );
}

// ── Projectile ────────────────────────────────────────────────────────────
function Projectile({ sx, py, r, color, type, camOffset }) {
  const { cx, cy } = slopeToCanvas(sx, py, camOffset);
  if (cx < -40 || cx > CANVAS_W + 40) return null;
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle r={r} fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth={1.5}
        style={{ filter: `drop-shadow(0 0 ${type === 'explosive' ? 8 : 4}px ${color})` }} />
      {type === 'explosive' && <circle r={r * 0.5} fill="#ffcc00" opacity={0.8} />}
      {type === 'bouncy'    && <circle r={r * 0.45} fill="rgba(255,255,255,0.3)" />}
      {/* Speed trail */}
      <line x1={0} y1={0} x2={r + 14} y2={0} stroke={color} strokeWidth={2} opacity={0.4} />
    </g>
  );
}

// ── Explosion ─────────────────────────────────────────────────────────────
function Explosion({ sx, py, r, color, camOffset }) {
  const { cx, cy } = slopeToCanvas(sx, py, camOffset);
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle r={r} fill={color} opacity={0.35} />
      <circle r={r * 0.55} fill={color} opacity={0.6} />
      <circle r={r * 0.25} fill="#fff" opacity={0.8} />
      {[0,60,120,180,240,300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return <line key={i} x1={0} y1={0}
          x2={Math.cos(rad) * r * 0.9} y2={Math.sin(rad) * r * 0.9}
          stroke={color} strokeWidth={3} opacity={0.7} />;
      })}
    </g>
  );
}

// ── Player ball ───────────────────────────────────────────────────────────
function PlayerBall({ sx, py, phase, camOffset }) {
  if (phase === 'idle' || phase === 'aiming') return null;
  const { cx, cy } = slopeToCanvas(sx, py, camOffset);
  const isRagdoll = phase === 'ragdoll';

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {isRagdoll && (
        <circle r={26} fill="rgba(255,30,30,0.2)" stroke="rgba(255,30,30,0.5)" strokeWidth={2}>
          <animate attributeName="r" values="22;30;22" dur="0.4s" repeatCount="indefinite" />
        </circle>
      )}
      <circle r={16} fill={isRagdoll ? '#cc2200' : '#d8d8d8'}
        stroke={isRagdoll ? '#ff4444' : '#999'} strokeWidth={2}
        style={{ filter: `drop-shadow(0 3px 5px rgba(0,0,0,0.6))` }} />
      {/* Eyes */}
      {isRagdoll ? (
        <>
          <line x1={-5} y1={-5} x2={-2} y2={-2} stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} />
          <line x1={-2} y1={-5} x2={-5} y2={-2} stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} />
          <line x1={2}  y1={-5} x2={5}  y2={-2} stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} />
          <line x1={5}  y1={-5} x2={2}  y2={-2} stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} />
          <path d="M -4 4 Q 0 1 4 4" stroke="rgba(255,255,255,0.9)" strokeWidth={2} fill="none" />
        </>
      ) : (
        <>
          <circle cx={-5} cy={-4} r={4} fill="rgba(0,0,0,0.75)" />
          <circle cx={5}  cy={-4} r={4} fill="rgba(0,0,0,0.75)" />
          <path d="M -4 3 Q 0 7 4 3" stroke="rgba(0,0,0,0.75)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </>
      )}
      {/* Speed lines when climbing */}
      {phase === 'climbing' && (
        <>
          <line x1={-16-2} y1={-2} x2={-16-20} y2={-2} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
          <line x1={-16-2} y1={4}  x2={-16-13} y2={4}  stroke="rgba(255,255,255,0.35}" strokeWidth={1.5} />
        </>
      )}
    </g>
  );
}

// ── Cannon at origin (player launch cannon) ────────────────────────────────
function LaunchCannon({ angle, phase }) {
  const ox = SLOPE_ORIG_X - 10;
  const oy = SLOPE_ORIG_Y;
  const isAiming = phase === 'aiming';
  return (
    <g transform={`translate(${ox}, ${oy})`}>
      <circle cx={-4} cy={6} r={16} fill="#2a1a08" stroke="#5a3a10" strokeWidth={2} />
      <circle cx={28} cy={6} r={16} fill="#2a1a08" stroke="#5a3a10" strokeWidth={2} />
      <rect x={-16} y={-8} width={56} height={18} rx={5} fill="#1a1008" stroke="#3a2008" strokeWidth={2} />
      {/* Barrel angled up the slope */}
      <g transform={`rotate(${-(angle + SLOPE_ANGLE_DEG)}, 12, -2)`}>
        <rect x={8} y={-9} width={56} height={18} rx={9} fill="#111" stroke="#444" strokeWidth={2} />
        <rect x={58} y={-11} width={10} height={22} rx={4} fill="#0a0a0a" stroke="#333" strokeWidth={2} />
      </g>
      {/* Fuse */}
      {(phase === 'aiming' || phase === 'idle' || phase === 'landed') && (
        <g>
          <path d="M 12 -8 Q 18 -22 24 -16" stroke="#8B4513" strokeWidth={2.5} fill="none" strokeLinecap="round"/>
          <circle cx={24} cy={-16} r={4} fill={isAiming ? '#ff6600' : '#993300'}>
            {isAiming && <animate attributeName="r" values="3;5;3" dur="0.2s" repeatCount="indefinite" />}
          </circle>
        </g>
      )}
      {/* Muzzle flash on launch */}
      {phase === 'climbing' && (
        <g transform={`rotate(${-(angle + SLOPE_ANGLE_DEG)}, 12, -2)`}>
          <ellipse cx={74} cy={0} rx={16} ry={10} fill="#ff6600" opacity={0.9} />
          <ellipse cx={74} cy={0} rx={10} ry={6} fill="#ffcc00" opacity={0.95} />
        </g>
      )}
    </g>
  );
}

// ── Main canvas export ─────────────────────────────────────────────────────
export default function CannonGame({ engine }) {
  const {
    phase, angle, ballSlopeDist, ballPerp, cameraOffset,
    distance, topDistance, activeBoost, projectiles,
    explosions, cannons, safeZones, ragdollTimer,
  } = engine;

  const RAGDOLL_TOTAL = 1800;
  const ragdollPct = Math.min(1, ragdollTimer / RAGDOLL_TOTAL);

  return (
    <div className="flex flex-col gap-3">
      {/* Game canvas */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#1e2240]"
        style={{ height: CANVAS_H, background: 'linear-gradient(180deg, #1a3060 0%, #2a508a 40%, #4a90c8 80%, #70b0d0 100%)' }}>
        <svg width="100%" height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="xMidYMid meet">
          {/* Sky gradient */}
          <defs>
            <linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a2a60" />
              <stop offset="60%" stopColor="#3a70b0" />
              <stop offset="100%" stopColor="#70b0d0" />
            </linearGradient>
          </defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#skyg)" />

          {/* Background mountains */}
          <polygon points="0,280 80,160 160,240 240,140 320,220 400,120 480,200 560,110 640,190 720,100 800,180 860,120 860,340 0,340"
            fill="#1a4060" opacity={0.5} />
          <polygon points="0,300 100,200 200,260 300,180 400,240 500,160 600,220 700,150 800,210 860,160 860,340 0,340"
            fill="#1a3050" opacity={0.4} />

          {/* Clouds */}
          {[[100,50],[260,30],[450,55],[650,35]].map(([cx,cy],i)=>(
            <g key={i} transform={`translate(${cx},${cy})`} opacity={0.5}>
              <ellipse cx={0} cy={0} rx={28} ry={16} fill="white" />
              <ellipse cx={20} cy={-5} rx={20} ry={12} fill="white" />
              <ellipse cx={-18} cy={-4} rx={18} ry={11} fill="white" />
            </g>
          ))}

          {/* Slope + objects */}
          <Slope camOffset={cameraOffset} />

          {/* Safe zones */}
          {safeZones.map((sx, i) => (
            <SafeZone key={i} sx={sx} camOffset={cameraOffset} />
          ))}

          {/* Enemy cannons */}
          {cannons.map(c => (
            <EnemyCannon key={c.id} sx={c.slopeDist} camOffset={cameraOffset}
              telegraph={c.telegraph} type={c.type} />
          ))}

          {/* Explosions */}
          {explosions.map(e => (
            <Explosion key={e.id} sx={e.sx} py={e.py ?? 0} r={e.r} color={e.color} camOffset={cameraOffset} />
          ))}

          {/* Projectiles */}
          {projectiles.map(p => (
            <Projectile key={p.id} sx={p.sx} py={p.py} r={p.r}
              color={p.color} type={p.type} camOffset={cameraOffset} />
          ))}

          {/* Player ball */}
          <PlayerBall sx={ballSlopeDist} py={ballPerp} phase={phase} camOffset={cameraOffset} />

          {/* Launch cannon (always at origin, no camera) */}
          {cameraOffset < 100 && <LaunchCannon angle={angle} phase={phase} />}

          {/* Ragdoll recovery bar */}
          {phase === 'ragdoll' && (
            <g>
              <rect x={CANVAS_W/2 - 80} y={16} width={160} height={22} rx={6} fill="rgba(0,0,0,0.7)" stroke="#ff4444" strokeWidth={2} />
              <rect x={CANVAS_W/2 - 78} y={18} width={156 * ragdollPct} height={18} rx={5} fill="#ff4444" />
              <text x={CANVAS_W/2} y={32} textAnchor="middle" fontSize={11} fontWeight="bold" fill="white">😵 RECOVERING...</text>
            </g>
          )}

          {/* Aiming HUD */}
          {phase === 'aiming' && (
            <g>
              <rect x={CANVAS_W/2 - 95} y={16} width={190} height={36} rx={10} fill="rgba(255,100,0,0.9)" stroke="#ff6600" strokeWidth={2} />
              <text x={CANVAS_W/2} y={39} textAnchor="middle" fontSize={16} fontWeight="900" fill="white">🎯 AIMING…</text>
            </g>
          )}

          {/* Live distance HUD */}
          {(phase === 'climbing' || phase === 'ragdoll') && (
            <g>
              <rect x={CANVAS_W - 126} y={10} width={116} height={38} rx={8} fill="rgba(0,0,0,0.7)" stroke="rgba(255,215,0,0.5)" strokeWidth={1.5} />
              <text x={CANVAS_W - 68} y={35} textAnchor="middle" fontSize={21} fontWeight="900" fill="#ffd700" fontFamily="monospace">
                {distance}m
              </text>
            </g>
          )}

          {/* Top record */}
          {topDistance > 0 && (
            <g>
              <rect x={10} y={10} width={100} height={32} rx={7} fill="rgba(0,0,0,0.6)" stroke="rgba(255,215,0,0.3)" strokeWidth={1} />
              <text x={60} y={30} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#ffd700">
                🏆 {topDistance}m
              </text>
            </g>
          )}
        </svg>

        {/* Active boost pop */}
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          ['Distance',  distance ? `${distance}m` : '—',     'text-cyan-400'],
          ['Record',    topDistance ? `${topDistance}m` : '—','text-yellow-400'],
          ['Phase',     phase.toUpperCase(),                   'text-orange-400'],
          ['Cannons',   `${cannons.length} active`,            'text-red-400'],
        ].map(([label, val, cls]) => (
          <div key={label} className="bg-[#151828] border border-[#1e2240] rounded-xl p-2 text-center">
            <div className="text-[9px] text-gray-600 uppercase tracking-widest">{label}</div>
            <div className={`text-sm font-black font-mono ${cls}`}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
