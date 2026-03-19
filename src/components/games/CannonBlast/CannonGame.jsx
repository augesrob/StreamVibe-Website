/**
 * CannonGame v7 — Real Ball Guys flat-platform renderer
 * Cannon fires ball RIGHT. Ball lands, rolls, hits obstacles for distance.
 * Camera follows ball rightward. All positions in World Units (WU).
 */
import React, { useCallback } from 'react';
import { PX_PER_WU, FLOOR_ZONES, CHARGE_MAX, CHARGE_THRESHOLD, CHEST_TYPES } from '@/hooks/useCannonEngine';

const CW     = 880;   // canvas width  px
const CH     = 320;   // canvas height px
const PX     = PX_PER_WU;
const GND_Y  = CH - 60;   // y pixel of ground surface
const BALL_R = 11;         // ball radius px
const CANNON_X = 90;       // cannon x in canvas (fixed)

// World → canvas: wx (world x) + camWx (camera scroll) → canvas x
function wx2cx(wx, camWx) { return CANNON_X + (wx - camWx) * PX; }
function wy2cy(wy)         { return GND_Y - wy * PX; }

// ── Floor zone strips ─────────────────────────────────────────────────────
function FloorZones({ camWx }) {
  return (
    <>
      {FLOOR_ZONES.map((z, i) => {
        const x1 = wx2cx(z.minWx, camWx);
        const x2 = i + 1 < FLOOR_ZONES.length ? wx2cx(FLOOR_ZONES[i+1].minWx, camWx) : CW + 60;
        if (x2 < -10 || x1 > CW + 10) return null;
        const w = x2 - x1;
        return (
          <g key={i}>
            <rect x={x1} y={GND_Y} width={w} height={CH - GND_Y} fill={z.color}/>
            <rect x={x1} y={GND_Y} width={w} height={3}
              fill={['#22cc44','#44cc88','#44cccc','#4488cc','#9944cc'][i]} opacity={0.7}/>
            <text x={Math.max(x1+6, Math.min(x2-6, (x1+x2)/2))} y={GND_Y + 18}
              textAnchor="middle" fontSize={11} fontWeight="bold"
              fill={['#22cc44','#44cc88','#44cccc','#4488cc','#9944cc'][i]} opacity={0.8}>
              {z.label}
            </text>
          </g>
        );
      })}
      {/* Ground line */}
      <line x1={0} y1={GND_Y} x2={CW} y2={GND_Y} stroke="#2a5a2a" strokeWidth={3}/>
    </>
  );
}

// ── Distance markers ──────────────────────────────────────────────────────
function DistanceMarkers({ camWx }) {
  const marks = [];
  for (let m = 0; m <= 350; m += 20) {
    const cx = wx2cx(m, camWx);
    if (cx < -10 || cx > CW + 10) continue;
    marks.push(
      <g key={m}>
        <line x1={cx} y1={GND_Y - 6} x2={cx} y2={GND_Y + 3} stroke="#2a4a2a" strokeWidth={1.5}/>
        <text x={cx} y={GND_Y - 10} textAnchor="middle" fontSize={8} fill="#3a6a3a">{m}m</text>
      </g>
    );
  }
  return <>{marks}</>;
}

// ── Obstacle ──────────────────────────────────────────────────────────────
function Obstacle({ ob, camWx }) {
  if (!ob.active) return null;
  const cx = wx2cx(ob.wx, camWx);
  const cy = wy2cy(ob.wy);
  if (cx < -30 || cx > CW + 30) return null;

  if (ob.type === 'bomb') return (
    <g transform={`translate(${cx},${cy})`}>
      <circle r={ob.r * PX} fill="#1a0a00" stroke={ob.color} strokeWidth={2}
        style={{ filter:`drop-shadow(0 0 6px ${ob.color})` }}/>
      <circle r={ob.r * PX * 0.55} fill={ob.color} opacity={0.7}/>
      <line x1={0} y1={-ob.r*PX} x2={4} y2={-ob.r*PX - 8} stroke="#ffaa00" strokeWidth={2}/>
      <circle cx={4} cy={-ob.r*PX-8} r={3} fill="#ffee00">
        <animate attributeName="opacity" values="1;0.3;1" dur="0.4s" repeatCount="indefinite"/>
      </circle>
      <text x={0} y={ob.r*PX+14} textAnchor="middle" fontSize={9} fill={ob.color}>💣</text>
    </g>
  );

  if (ob.type === 'bouncer') return (
    <g transform={`translate(${cx},${cy})`}>
      <ellipse rx={ob.r*PX*1.1} ry={ob.r*PX*0.85} fill="#1a0a2a" stroke={ob.color} strokeWidth={2.5}
        style={{ filter:`drop-shadow(0 0 8px ${ob.color})` }}/>
      <ellipse rx={ob.r*PX*0.7} ry={ob.r*PX*0.55} fill={ob.color} opacity={0.5}/>
      <text x={0} y={5} textAnchor="middle" fontSize={13}>🟡</text>
    </g>
  );

  if (ob.type === 'power') return (
    <g transform={`translate(${cx},${cy})`}>
      <circle r={ob.r*PX} fill="#001a2a" stroke={ob.color} strokeWidth={2}
        style={{ filter:`drop-shadow(0 0 8px ${ob.color})` }}>
        <animate attributeName="r" values={`${ob.r*PX};${ob.r*PX*1.2};${ob.r*PX}`} dur="0.8s" repeatCount="indefinite"/>
      </circle>
      <text x={0} y={5} textAnchor="middle" fontSize={13}>⚡</text>
    </g>
  );
  return null;
}

// ── Explosion ─────────────────────────────────────────────────────────────
function Explosion({ ex, camWx }) {
  const cx = wx2cx(ex.wx, camWx), cy = wy2cy(ex.wy ?? 0);
  const rpx = ex.r * PX * 0.5;
  return (
    <g transform={`translate(${cx},${cy})`}>
      <circle r={rpx*1.8} fill={ex.color} opacity={0.2}/>
      <circle r={rpx}     fill={ex.color} opacity={0.5}/>
      <circle r={rpx*0.4} fill="#fff"     opacity={0.9}/>
      {[0,45,90,135,180,225,270,315].map((d,i)=>{
        const rad=(d*Math.PI)/180;
        return <line key={i} x1={0} y1={0}
          x2={Math.cos(rad)*rpx*1.5} y2={Math.sin(rad)*rpx*1.5}
          stroke={ex.color} strokeWidth={2.5} opacity={0.8}/>;
      })}
    </g>
  );
}

// ── Hit label effect ─────────────────────────────────────────────────────
function HitEffect({ ef, camWx }) {
  const cx = wx2cx(ef.wx, camWx), cy = wy2cy(ef.wy ?? 0) - 20;
  return (
    <text x={cx} y={cy} textAnchor="middle" fontSize={13} fontWeight="900"
      fill={ef.color} stroke="black" strokeWidth={1}
      style={{ filter:`drop-shadow(0 0 4px ${ef.color})` }}>
      {ef.label}
    </text>
  );
}

// ── Trajectory arc preview ────────────────────────────────────────────────
function TrajectoryArc({ points, camWx }) {
  if (!points || points.length < 2) return null;
  const d = points.map((p, i) => {
    const cx = wx2cx(p.wx, camWx), cy = wy2cy(p.wy);
    return `${i === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
  }).join(' ');
  return (
    <path d={d} fill="none" stroke="rgba(255,215,0,0.35)" strokeWidth={2}
      strokeDasharray="6,5"/>
  );
}

// ── Ball ─────────────────────────────────────────────────────────────────
function Ball({ wx, wy, rot, phase }) {
  if (phase === 'idle' || phase === 'chest_pick' || phase === 'charging') return null;
  const cx = wx2cx(wx, 0) - CANNON_X + CANNON_X; // always relative to cam passed separately
  return null; // rendered in main with camWx
}

function BallInWorld({ wx, wy, rot, phase, camWx }) {
  if (phase === 'idle' || phase === 'chest_pick') return null;
  if (phase === 'charging' && wx === 0) return null;
  const cx = wx2cx(wx, camWx);
  const cy = wy2cy(wy);
  const isFlying = phase === 'in_flight';
  return (
    <g transform={`translate(${cx},${cy}) rotate(${rot})`}>
      {/* Shadow on ground */}
      {wy > 0 && (
        <ellipse cx={0} cy={GND_Y - cy} rx={BALL_R * (1 - wy/30)} ry={3}
          fill="rgba(0,0,0,0.3)" style={{ transform:`translateY(${GND_Y-cy}px)` }}/>
      )}
      <circle r={BALL_R} fill="#e0e0e0" stroke="#999" strokeWidth={2}
        style={{ filter:'drop-shadow(0 3px 8px rgba(0,0,0,0.7))' }}/>
      {/* Face — counter-rotates */}
      <g transform={`rotate(${-rot})`}>
        <circle cx={-4} cy={-3} r={3.5} fill="rgba(0,0,0,0.75)"/>
        <circle cx={4}  cy={-3} r={3.5} fill="rgba(0,0,0,0.75)"/>
        <path d="M -4 3 Q 0 7 4 3" stroke="rgba(0,0,0,0.75)" strokeWidth={2.5}
          fill="none" strokeLinecap="round"/>
      </g>
      {/* Speed lines when rolling */}
      {phase === 'rolling' && (
        <>
          <line x1={-BALL_R} y1={-2} x2={-BALL_R-16} y2={-2} stroke="rgba(255,255,255,0.6)" strokeWidth={2.5}/>
          <line x1={-BALL_R} y1={3}  x2={-BALL_R-10} y2={3}  stroke="rgba(255,255,255,0.35)" strokeWidth={2}/>
        </>
      )}
    </g>
  );
}

// ── Cannon (left side) ───────────────────────────────────────────────────
function Cannon({ chargeLevel, phase }) {
  const chargePct = chargeLevel / CHARGE_MAX;
  const barrelAngle = -10 - chargePct * 5; // slight up-angle when charged
  const isCharging = phase === 'charging';
  const isFired = phase === 'in_flight' || phase === 'rolling';
  return (
    <g transform={`translate(${CANNON_X - 10}, ${GND_Y})`}>
      {/* Wheels */}
      <circle cx={-10} cy={4} r={16} fill="#1a1008" stroke="#4a2a10" strokeWidth={2.5}/>
      <circle cx={18}  cy={4} r={16} fill="#1a1008" stroke="#4a2a10" strokeWidth={2.5}/>
      {/* Body */}
      <rect x={-22} y={-10} width={56} height={20} rx={6} fill="#120c04" stroke="#3a2008" strokeWidth={2}/>
      {/* Barrel — tilted up-right */}
      <g transform={`rotate(${barrelAngle}, 10, -3)`}>
        <rect x={6} y={-9} width={62} height={18} rx={9} fill="#0e0e0e" stroke="#555" strokeWidth={2}/>
        <rect x={62} y={-11} width={10} height={22} rx={4} fill="#080808" stroke="#444" strokeWidth={2}/>
        {/* Muzzle flash */}
        {isFired && <ellipse cx={78} cy={0} rx={18} ry={11} fill="#ff5500" opacity={0.9}/>}
        {isFired && <ellipse cx={78} cy={0} rx={10} ry={6} fill="#ffbb00"/>}
      </g>
      {/* Fuse */}
      {isCharging && (
        <>
          <path d="M 10 -10 Q 16 -24 22 -18" stroke="#7a3a0a" strokeWidth={2.5} fill="none" strokeLinecap="round"/>
          <circle cx={22} cy={-18} r={Math.max(2.5, 2.5 + chargePct*4)} fill="#ff6600">
            <animate attributeName="opacity" values="1;0.4;1" dur={`${0.5 - chargePct*0.35}s`} repeatCount="indefinite"/>
          </circle>
        </>
      )}
      {/* Charge glow */}
      {isCharging && chargePct > 0.3 && (
        <circle cx={10} cy={0} r={20 + chargePct*18} fill="rgba(255,200,0,0.08)"
          stroke={`rgba(255,200,0,${chargePct*0.4})`} strokeWidth={2}/>
      )}
    </g>
  );
}

// ── Charge bar HUD ───────────────────────────────────────────────────────
function ChargeBarHUD({ chargeLevel, phase }) {
  if (phase !== 'charging') return null;
  const pct = chargeLevel / CHARGE_MAX;
  const threshPct = CHARGE_THRESHOLD / CHARGE_MAX;
  const col = pct < 0.4 ? '#00e5ff' : pct < 0.7 ? '#ffd600' : pct < 0.9 ? '#ff6d00' : '#ff1744';
  return (
    <g transform={`translate(${CW/2 - 110}, 12)`}>
      <rect x={0} y={0} width={220} height={28} rx={10} fill="rgba(0,0,0,0.8)" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5}/>
      <rect x={3} y={3} width={214 * pct} height={22} rx={8} fill={col}
        style={{ filter:`drop-shadow(0 0 6px ${col})` }}/>
      {/* Threshold marker */}
      <line x1={3 + 214*threshPct} y1={0} x2={3 + 214*threshPct} y2={28} stroke="white" strokeWidth={2} opacity={0.6}/>
      <text x={110} y={19} textAnchor="middle" fontSize={11} fontWeight="900" fill="white">
        {pct < threshPct ? '⚡ CHARGE...' : pct < 0.99 ? `⚡ ${Math.round(pct*100)}% — RELEASE TO FIRE!` : '🔥 FULLY CHARGED!'}
      </text>
    </g>
  );
}

// ── Chest picker overlay ─────────────────────────────────────────────────
function ChestPicker({ chestsPicked, onPick }) {
  const remaining = 3 - chestsPicked.length;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl z-20">
      <div className="text-white font-black text-xl mb-2">PICK {remaining} CHEST{remaining!==1?'S':''}!</div>
      <div className="text-gray-400 text-xs mb-6">Gifts from viewers also pick chests!</div>
      <div className="flex gap-5">
        {Object.entries(CHEST_TYPES).map(([type, def]) => {
          const picked = chestsPicked.filter(t=>t===type).length;
          return (
            <button key={type} onClick={() => onPick(type)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:scale-110 active:scale-95"
              style={{ borderColor: def.color, background: `${def.color}18` }}>
              <div className="text-4xl">{def.emoji}</div>
              <div className="font-black text-sm" style={{ color: def.color }}>{def.label}</div>
              <div className="text-gray-500 text-[10px]">{def.desc}</div>
              {picked > 0 && <div className="text-xs font-bold" style={{ color: def.color }}>✓ picked</div>}
            </button>
          );
        })}
      </div>
      {chestsPicked.length > 0 && (
        <div className="mt-5 flex gap-2">
          {chestsPicked.map((t,i) => (
            <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-xl"
              style={{ background: CHEST_TYPES[t].color + '33', border: `2px solid ${CHEST_TYPES[t].color}` }}>
              {CHEST_TYPES[t].emoji}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export default function CannonGame({ engine }) {
  const {
    phase, chestsPicked, multipliers, chargeLevel, fuelsLeft,
    ballWx, ballWy, ballRot, camWx, currentDist, finalScore, bestScore,
    obstacles, explosions, hitEffects, activeBoost, trajectory, floorZone,
    pickChest, startHold, endHold,
  } = engine;

  const stunPct = 0;
  const showBall = phase !== 'idle' && phase !== 'chest_pick' &&
                   !(phase === 'charging');

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#1e2240]"
        style={{ height: CH }}>

        {/* Chest picker overlay */}
        {phase === 'chest_pick' && <ChestPicker chestsPicked={chestsPicked} onPick={pickChest}/>}

        <svg width="100%" height={CH} viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="xMidYMid meet"
          style={{ background:'linear-gradient(180deg,#0d1a0d 0%,#0a2a0a 50%,#0d1a0d 100%)' }}>

          {/* Background sky/trees */}
          {[40,120,220,340,480,620,760].map((x,i)=>(
            <g key={i} transform={`translate(${x - (camWx*PX*0.1)%CW},0)`} opacity={0.25}>
              <polygon points={`0,${CH-60} 16,${CH-110} 32,${CH-60}`} fill="#1a4a1a"/>
              <polygon points={`8,${CH-100} 20,${CH-140} 32,${CH-100}`} fill="#1a4a1a"/>
            </g>
          ))}

          {/* Floor zones + ground */}
          <FloorZones camWx={camWx}/>
          <DistanceMarkers camWx={camWx}/>

          {/* Wall at start */}
          <rect x={wx2cx(-2, camWx)} y={0} width={PX*2} height={GND_Y} fill="#1a1a0a" opacity={0.8}/>

          {/* Trajectory arc */}
          {phase === 'charging' && <TrajectoryArc points={trajectory} camWx={camWx}/>}

          {/* Obstacles */}
          {obstacles.map(ob => <Obstacle key={ob.id} ob={ob} camWx={camWx}/>)}

          {/* Explosions */}
          {explosions.map(ex => <Explosion key={ex.id} ex={ex} camWx={camWx}/>)}

          {/* Hit labels */}
          {hitEffects.map(ef => <HitEffect key={ef.id} ef={ef} camWx={camWx}/>)}

          {/* Ball */}
          {showBall && <BallInWorld wx={ballWx} wy={ballWy} rot={ballRot} phase={phase} camWx={camWx}/>}

          {/* Cannon — fixed left */}
          <Cannon chargeLevel={chargeLevel} phase={phase}/>

          {/* Charge bar */}
          <ChargeBarHUD chargeLevel={chargeLevel} phase={phase}/>

          {/* Live distance */}
          {(phase==='in_flight'||phase==='rolling') && (
            <g>
              <rect x={CW-130} y={10} width={120} height={40} rx={8} fill="rgba(0,0,0,0.75)" stroke="rgba(255,215,0,0.5)" strokeWidth={1.5}/>
              <text x={CW-70} y={26} textAnchor="middle" fontSize={10} fill="#aaa">DISTANCE</text>
              <text x={CW-70} y={44} textAnchor="middle" fontSize={20} fontWeight="900" fill="#ffd700" fontFamily="monospace">{currentDist}m</text>
            </g>
          )}

          {/* Floor zone indicator */}
          {(phase==='rolling') && floorZone.mult > 1 && (
            <g transform="translate(10,10)">
              <rect x={0} y={0} width={90} height={36} rx={7} fill="rgba(0,0,0,0.75)" stroke={floorZone.color} strokeWidth={2}/>
              <text x={45} y={23} textAnchor="middle" fontSize={14} fontWeight="900" fill={floorZone.color}>{floorZone.label} ZONE!</text>
            </g>
          )}

          {/* Best score */}
          {bestScore > 0 && (
            <g>
              <rect x={10} y={10} width={105} height={30} rx={7} fill="rgba(0,0,0,0.7)" stroke="rgba(255,215,0,0.3)" strokeWidth={1}/>
              <text x={62} y={30} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#ffd700">🏆 {bestScore} pts</text>
            </g>
          )}

          {/* Fuels remaining */}
          {fuelsLeft > 0 && (phase==='landed') && (
            <g transform={`translate(${CW/2-60},14)`}>
              <rect x={0} y={0} width={120} height={30} rx={8} fill="rgba(255,100,0,0.9)" stroke="#ff5500" strokeWidth={2}/>
              <text x={60} y={20} textAnchor="middle" fontSize={12} fontWeight="900" fill="white">🔥 {fuelsLeft} SHOT{fuelsLeft!==1?'S':''} LEFT!</text>
            </g>
          )}

          {/* Multiplier badges */}
          {phase !== 'idle' && phase !== 'chest_pick' && (
            <g transform="translate(10,52)">
              <text x={0} y={0} fontSize={10} fill="#ffd600">⚡{multipliers.power.toFixed(1)}× POWER</text>
              <text x={0} y={14} fontSize={10} fill="#ff6d00">💣 {multipliers.bomb} BOMBS</text>
              <text x={0} y={28} fontSize={10} fill="#7c4dff">🟡 {multipliers.bouncer} SPRING</text>
            </g>
          )}
        </svg>

        {/* Boost popup */}
        {activeBoost && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="px-5 py-2.5 rounded-2xl font-black text-lg text-black text-center animate-bounce"
              style={{ background:activeBoost.color, boxShadow:`0 0 28px ${activeBoost.color}99` }}>
              {activeBoost.emoji} {activeBoost.label}
              {activeBoost.user && <div className="text-xs opacity-75">from @{activeBoost.user}</div>}
            </div>
          </div>
        )}

        {/* Final score overlay */}
        {phase === 'landed' && finalScore > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-6xl font-black text-yellow-400 drop-shadow-lg"
                style={{ textShadow:'0 0 40px #ffd70088' }}>
                {finalScore}
              </div>
              <div className="text-white font-bold text-lg">POINTS</div>
              <div className="text-gray-400 text-sm">{currentDist}m × {floorZone.mult}× zone</div>
            </div>
          </div>
        )}
      </div>

      {/* Charge / fire button */}
      {phase === 'charging' && (
        <button
          onMouseDown={startHold} onMouseUp={endHold}
          onTouchStart={startHold} onTouchEnd={endHold}
          className="w-full py-4 rounded-2xl font-black text-xl tracking-widest select-none transition-all active:scale-95"
          style={{ background: chargeLevel >= CHARGE_THRESHOLD
            ? 'linear-gradient(135deg,#ff6d00,#ff1744)'
            : 'linear-gradient(135deg,#1a3a2a,#1a2a3a)',
            border: `3px solid ${chargeLevel >= CHARGE_THRESHOLD ? '#ff6d00' : '#1e2240'}`,
            color: chargeLevel >= CHARGE_THRESHOLD ? 'white' : '#666',
            boxShadow: chargeLevel >= CHARGE_THRESHOLD ? '0 0 30px #ff6d0088' : 'none',
          }}>
          {chargeLevel < CHARGE_THRESHOLD ? '⚡ HOLD TO CHARGE' : '🔥 RELEASE TO FIRE!'}
        </button>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          ['Distance', currentDist ? `${currentDist}m` : '—', 'text-cyan-400'],
          ['Score',    finalScore || (phase==='rolling' ? `${Math.round(currentDist * floorZone.mult * 10)}` : '—'), 'text-yellow-400'],
          ['Phase',    phase.replace('_',' ').toUpperCase(),
            phase==='in_flight'?'text-blue-400':phase==='rolling'?'text-green-400':phase==='charging'?'text-orange-400':'text-gray-400'],
          ['Fuels',    `${fuelsLeft} left`, fuelsLeft > 0 ? 'text-orange-400' : 'text-gray-600'],
        ].map(([l,v,c])=>(
          <div key={l} className="bg-[#151828] border border-[#1e2240] rounded-xl p-2 text-center">
            <div className="text-[9px] text-gray-600 uppercase tracking-widest">{l}</div>
            <div className={`text-sm font-black font-mono ${c}`}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
