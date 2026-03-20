/**
 * CannonGame v8 — Ball Guys accurate visual
 *
 * Sky background with clouds + hot air balloons.
 * Wooden platform at bottom with circular distance markers.
 * Ball fires into sky, lands, hits bombs/springs back up.
 * Username floats above the ball.
 */
import React from 'react';
import { PX_PER_WU, FLOOR_ZONES, CHARGE_MAX, CHARGE_THRESHOLD, CHEST_TYPES } from '@/hooks/useCannonEngine';

const CW      = 880;   // canvas width px
const CH      = 460;   // canvas height px — tall enough for high arc
const PX      = PX_PER_WU;
const PLAT_Y  = CH - 72;  // y of platform surface in canvas
const PLAT_H  = 44;        // platform strip height
const BALL_R  = 11;
const CANNON_CX = 80; // cannon x in canvas (fixed)

function wx2cx(wx, camWx) { return CANNON_CX + (wx - camWx) * PX; }
function wy2cy(wy)         { return PLAT_Y - wy * PX; }

// ── Sky background with clouds & balloons ────────────────────────────────
function SkyBackground({ camWx }) {
  // Parallax: clouds move slower than ball
  const p1 = (camWx * 0.2) % CW;
  const p2 = (camWx * 0.35) % (CW * 1.5);

  const clouds = [
    { x:80,  y:60,  s:1.0 }, { x:280, y:35,  s:0.7 }, { x:500, y:70,  s:1.2 },
    { x:680, y:45,  s:0.8 }, { x:820, y:80,  s:0.9 }, { x:150, y:130, s:0.6 },
    { x:400, y:110, s:1.1 }, { x:620, y:140, s:0.7 }, { x:750, y:100, s:1.0 },
  ];

  return (
    <>
      {/* Sky gradient */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#7ec8f5"/>
          <stop offset="60%"  stopColor="#b8e4f9"/>
          <stop offset="100%" stopColor="#d6f0fa"/>
        </linearGradient>
      </defs>
      <rect width={CW} height={CH} fill="url(#skyGrad)"/>

      {/* Clouds layer 1 (distant, slower) */}
      {clouds.map((c,i) => {
        const cx = ((c.x - p1 * 0.5 + CW * 2) % (CW + 200)) - 100;
        return (
          <g key={i} transform={`translate(${cx},${c.y}) scale(${c.s})`} opacity={0.85}>
            <ellipse cx={0}   cy={0}  rx={38} ry={22} fill="white"/>
            <ellipse cx={28}  cy={-8} rx={28} ry={20} fill="white"/>
            <ellipse cx={-26} cy={-6} rx={24} ry={18} fill="white"/>
          </g>
        );
      })}

      {/* Hot air balloons (parallax, drift slowly) */}
      {[
        { bx:320, by:160, p:0.15, col1:'#ff6b35', col2:'#ffd700' },
        { bx:680, by:200, p:0.25, col1:'#44cc88', col2:'#ffeeaa' },
      ].map((b,i) => {
        const bx = ((b.bx - camWx * b.p + CW * 4) % (CW + 400)) - 200;
        return (
          <g key={i} transform={`translate(${bx},${b.by})`}>
            {/* Balloon */}
            <ellipse cx={0} cy={0} rx={28} ry={34}
              fill={b.col1} stroke={b.col2} strokeWidth={2}/>
            {/* Stripes */}
            {[-14,0,14].map((x,j) => (
              <line key={j} x1={x} y1={-34} x2={x} y2={34}
                stroke={b.col2} strokeWidth={1.5} opacity={0.5}/>
            ))}
            {/* Basket */}
            <rect x={-8} cy={34} y={36} width={16} height={10} rx={2}
              fill="#8b6914" stroke="#5a4510" strokeWidth={1.5}/>
            {/* Ropes */}
            <line x1={-8} y1={34} x2={-6} y2={44} stroke="#8b6914" strokeWidth={1.2}/>
            <line x1={8}  y1={34} x2={6}  y2={44} stroke="#8b6914" strokeWidth={1.2}/>
          </g>
        );
      })}
    </>
  );
}

// ── Wooden platform ───────────────────────────────────────────────────────
function Platform({ camWx }) {
  // Wooden plank planks
  const planks = [];
  for (let wx = -5; wx < 350; wx += 4) {
    const cx1 = wx2cx(wx,     camWx);
    const cx2 = wx2cx(wx + 4, camWx);
    if (cx2 < -5 || cx1 > CW + 5) continue;
    planks.push(
      <rect key={wx} x={cx1} y={PLAT_Y} width={Math.max(0,cx2-cx1-1)} height={PLAT_H}
        fill={wx % 8 === 0 ? '#c8943a' : '#d4a044'} stroke="#a07030" strokeWidth={0.5}/>
    );
  }
  return (
    <>
      {planks}
      {/* Top edge highlight */}
      <rect x={0} y={PLAT_Y} width={CW} height={4} fill="#e8b85a"/>
      {/* Shadow under platform edge */}
      <rect x={0} y={PLAT_Y+4} width={CW} height={3} fill="rgba(0,0,0,0.15)"/>
    </>
  );
}

// ── Distance markers — colored circles like real game ────────────────────
function DistanceMarkers({ camWx }) {
  const markers = [];
  const colors = ['#44cc44','#44cc44','#44aacc','#aa44cc','#cc4444'];

  for (let m = -2; m <= 350; m++) {
    const cx = wx2cx(m, camWx);
    if (cx < -24 || cx > CW + 24) continue;
    const colorIdx = m < 0 ? 2 : Math.floor(m / 40) % colors.length;
    const col = m < 0 ? '#aaa' : colors[colorIdx];
    const r = m % 5 === 0 ? 13 : 9; // bigger every 5
    markers.push(
      <g key={m} transform={`translate(${cx},${PLAT_Y + PLAT_H / 2 + 3})`}>
        <circle r={r} fill={col} stroke="rgba(0,0,0,0.3)" strokeWidth={1.5}/>
        <text textAnchor="middle" y={5} fontSize={m % 5 === 0 ? 10 : 8}
          fontWeight="900" fill="white" fontFamily="Arial Black,sans-serif">{m}</text>
      </g>
    );
  }
  return <>{markers}</>;
}

// ── Obstacles on platform ─────────────────────────────────────────────────
function Obstacle({ ob, camWx }) {
  if (!ob.active) return null;
  const cx = wx2cx(ob.wx, camWx);
  const cy = wy2cy(ob.wy);
  if (cx < -30 || cx > CW + 30) return null;

  if (ob.type === 'bomb') {
    // Red round mine like the screenshots
    const r = ob.r * PX;
    return (
      <g transform={`translate(${cx},${cy})`}>
        <circle r={r} fill="#cc2222" stroke="#881111" strokeWidth={2}
          style={{ filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}/>
        <circle r={r * 0.5} fill="#ff4444" opacity={0.6}/>
        {/* Spikes */}
        {[0,45,90,135,180,225,270,315].map((deg,i) => {
          const rad = deg * Math.PI / 180;
          return <line key={i}
            x1={Math.cos(rad)*r} y1={Math.sin(rad)*r}
            x2={Math.cos(rad)*(r+5)} y2={Math.sin(rad)*(r+5)}
            stroke="#881111" strokeWidth={2} strokeLinecap="round"/>;
        })}
      </g>
    );
  }

  if (ob.type === 'bouncer') {
    // Yellow spring bumper
    const r = ob.r * PX;
    return (
      <g transform={`translate(${cx},${cy})`}>
        {/* Spring coils */}
        {[0,4,8,12].map(dy => (
          <ellipse key={dy} cx={0} cy={dy - 6} rx={r*0.8} ry={3}
            fill="none" stroke="#ffaa00" strokeWidth={2.5}/>
        ))}
        {/* Bumper top */}
        <circle cy={-8} r={r} fill="#ffcc00" stroke="#cc8800" strokeWidth={2}
          style={{ filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}/>
        <circle cy={-8} r={r*0.55} fill="#ffe066"/>
      </g>
    );
  }
  return null;
}

// ── Explosion ─────────────────────────────────────────────────────────────
function Explosion({ ex, camWx }) {
  const cx = wx2cx(ex.wx, camWx);
  const cy = wy2cy(0);
  return (
    <g transform={`translate(${cx},${cy})`}>
      <circle r={40} fill="#ff6600" opacity={0.3}/>
      <circle r={25} fill="#ff9900" opacity={0.6}/>
      <circle r={12} fill="#ffff00" opacity={0.9}/>
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((d,i) => {
        const rad = d * Math.PI / 180;
        return <line key={i} x1={0} y1={0}
          x2={Math.cos(rad)*45} y2={Math.sin(rad)*45}
          stroke="#ff6600" strokeWidth={3} opacity={0.7}/>;
      })}
    </g>
  );
}

// ── Hit labels ────────────────────────────────────────────────────────────
function HitEffect({ ef, camWx }) {
  const cx = wx2cx(ef.wx, camWx);
  const cy = wy2cy(ef.wy);
  return (
    <text x={cx} y={cy} textAnchor="middle" fontSize={16} fontWeight="900"
      fontFamily="Arial Black,sans-serif" fill={ef.color}
      stroke="white" strokeWidth={2} paintOrder="stroke">
      {ef.label}
    </text>
  );
}

// ── Trajectory arc ────────────────────────────────────────────────────────
function TrajectoryArc({ points, camWx }) {
  if (!points || points.length < 2) return null;
  const d = points.map((p, i) => {
    const cx = wx2cx(p.wx, camWx), cy = wy2cy(p.wy);
    return `${i === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
  }).join(' ');
  return (
    <path d={d} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2.5}
      strokeDasharray="8,6"/>
  );
}

// ── Ball with username ────────────────────────────────────────────────────
function Ball({ wx, wy, rot, phase, camWx, username }) {
  if (phase === 'idle' || phase === 'chest_pick') return null;
  if (phase === 'charging') return null;
  const cx = wx2cx(wx, camWx);
  const cy = wy2cy(wy);
  if (cx < -30 || cx > CW + 30) return null;

  return (
    <g>
      {/* Shadow on platform */}
      {wy < 8 && (
        <ellipse cx={cx} cy={PLAT_Y - 2} rx={Math.max(4, BALL_R * (1 - wy/8))} ry={3}
          fill="rgba(0,0,0,0.25)"/>
      )}
      {/* Ball */}
      <g transform={`translate(${cx},${cy}) rotate(${rot})`}>
        <circle r={BALL_R} fill="#555" stroke="#333" strokeWidth={2}
          style={{ filter:'drop-shadow(0 3px 6px rgba(0,0,0,0.6))' }}/>
        {/* Texture lines */}
        <g transform={`rotate(${-rot})`}>
          <circle cx={-4} cy={-3} r={3} fill="rgba(255,255,255,0.8)"/>
          <circle cx={4}  cy={-3} r={3} fill="rgba(255,255,255,0.8)"/>
          <path d="M -4 3 Q 0 6 4 3" stroke="rgba(255,255,255,0.8)" strokeWidth={2}
            fill="none" strokeLinecap="round"/>
        </g>
      </g>
      {/* Username label above ball */}
      {username && (
        <text x={cx} y={cy - BALL_R - 7} textAnchor="middle"
          fontSize={11} fontWeight="700" fontFamily="Arial,sans-serif"
          fill="white" stroke="rgba(0,0,0,0.7)" strokeWidth={3} paintOrder="stroke">
          {username}
        </text>
      )}
    </g>
  );
}

// ── Cannon (fixed left, on platform) ─────────────────────────────────────
function Cannon({ chargeLevel, phase }) {
  const pct = chargeLevel / CHARGE_MAX;
  const barrelAngle = -(28 + pct * 10); // points more upward when charged
  const isCharging = phase === 'charging';
  const isFired    = phase === 'in_flight' || phase === 'rolling';
  const baseY = PLAT_Y;

  return (
    <g transform={`translate(${CANNON_CX}, ${baseY})`}>
      {/* Wheels */}
      <circle cx={-14} cy={2} r={14} fill="#333" stroke="#222" strokeWidth={2}/>
      <circle cx={14}  cy={2} r={14} fill="#333" stroke="#222" strokeWidth={2}/>
      {/* Spokes */}
      {[0,60,120].map(d => {
        const r = d*Math.PI/180;
        return <line key={d} x1={-14+Math.cos(r)*12} y1={2+Math.sin(r)*12}
          x2={-14-Math.cos(r)*12} y2={2-Math.sin(r)*12} stroke="#555" strokeWidth={1.5}/>;
      })}
      {/* Body */}
      <rect x={-20} y={-12} width={50} height={18} rx={5} fill="#2a2a2a" stroke="#555" strokeWidth={1.5}/>
      {/* Barrel */}
      <g transform={`rotate(${barrelAngle}, 8, -4)`}>
        <rect x={4} y={-8} width={58} height={16} rx={8} fill="#1a1a1a" stroke="#666" strokeWidth={2}/>
        <rect x={58} y={-10} width={8} height={20} rx={4} fill="#111" stroke="#555" strokeWidth={1.5}/>
        {isFired && (
          <>
            <ellipse cx={72} cy={0} rx={16} ry={10} fill="#ff6600" opacity={0.9}/>
            <ellipse cx={72} cy={0} rx={9}  ry={6}  fill="#ffcc00"/>
          </>
        )}
      </g>
      {/* Fuse */}
      {isCharging && (
        <>
          <path d="M 8 -12 Q 15 -26 22 -18" stroke="#886633" strokeWidth={2.5} fill="none" strokeLinecap="round"/>
          <circle cx={22} cy={-18} r={Math.max(2, 2 + pct*5)} fill="#ff6600">
            <animate attributeName="opacity" values="1;0.3;1" dur={`${0.6 - pct*0.4}s`} repeatCount="indefinite"/>
          </circle>
        </>
      )}
    </g>
  );
}

// ── Multiplier HUD (top-left, like real game) ─────────────────────────────
function MultiplierHUD({ multipliers, phase, score }) {
  if (phase === 'idle' || phase === 'chest_pick') return null;
  return (
    <g transform="translate(10,10)">
      <rect x={0} y={0} width={88} height={76} rx={6}
        fill="rgba(240,230,180,0.92)" stroke="#8b6914" strokeWidth={2}/>
      {[
        { icon:'🔫', val:`${multipliers.power.toFixed(1)}x`, color:'#cc6600' },
        { icon:'💣', val:`${multipliers.bomb}x`,            color:'#cc2222' },
        { icon:'🟡', val:`${multipliers.bouncer}x`,         color:'#cc8800' },
      ].map((m, i) => (
        <g key={i} transform={`translate(6, ${8 + i*22})`}>
          <text y={14} fontSize={14}>{m.icon}</text>
          <text x={22} y={14} fontSize={12} fontWeight="900" fill={m.color}
            fontFamily="Arial Black,sans-serif">
            {m.val}
          </text>
        </g>
      ))}
    </g>
  );
}

// ── Score HUD (top, like real game) ──────────────────────────────────────
function ScoreHUD({ score, dist, phase }) {
  if (!score && !dist) return null;
  const rewards = dist < 30 ? 'Poor' : dist < 60 ? 'Fair' : dist < 100 ? 'Good' : 'Amazing!';
  const rColor  = dist < 30 ? '#cc6644' : dist < 60 ? '#ccaa44' : dist < 100 ? '#44cc66' : '#44aacc';
  return (
    <g transform={`translate(${CW/2 - 70}, 8)`}>
      <rect x={0} y={0} width={140} height={42} rx={6}
        fill="rgba(240,230,180,0.92)" stroke="#8b6914" strokeWidth={2}/>
      <text x={8}  y={17} fontSize={12} fontFamily="Arial,sans-serif" fill="#333">Score:</text>
      <text x={60} y={17} fontSize={14} fontWeight="900" fill="#33aa33"
        fontFamily="Arial Black,sans-serif">{score || dist * 10}</text>
      <text x={8}  y={35} fontSize={11} fontFamily="Arial,sans-serif" fill="#555">Rewards:</text>
      <text x={68} y={35} fontSize={12} fontWeight="900" fill={rColor}
        fontFamily="Arial Black,sans-serif">{rewards}</text>
    </g>
  );
}

// ── Charge bar (center top) ───────────────────────────────────────────────
function ChargeBarHUD({ chargeLevel, phase }) {
  if (phase !== 'charging') return null;
  const pct = chargeLevel / CHARGE_MAX;
  const thresh = CHARGE_THRESHOLD / CHARGE_MAX;
  const col = pct < 0.4 ? '#44aaff' : pct < 0.7 ? '#ffcc00' : pct < 0.9 ? '#ff8800' : '#ff2222';
  return (
    <g transform={`translate(${CW/2 - 120}, CH - 20}`}>
      <rect x={0} y={CH - 40} width={240} height={26} rx={13}
        fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}/>
      <rect x={3} y={CH - 37} width={Math.max(0, 234 * pct)} height={20} rx={10} fill={col}
        style={{ filter:`drop-shadow(0 0 8px ${col})` }}/>
      <line x1={3 + 234*thresh} y1={CH-40} x2={3+234*thresh} y2={CH-14}
        stroke="white" strokeWidth={2} opacity={0.7}/>
      <text x={120} y={CH - 23} textAnchor="middle" fontSize={11} fontWeight="900"
        fill="white" fontFamily="Arial Black,sans-serif">
        {pct < thresh ? '⚡ CHARGE...' : pct >= 0.99 ? '🔥 FIRE!' : `⚡ ${Math.round(pct*100)}% — RELEASE TO FIRE!`}
      </text>
    </g>
  );
}

// ── Chest picker ──────────────────────────────────────────────────────────
function ChestPicker({ chestsPicked, onPick }) {
  const remaining = 3 - chestsPicked.length;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-20"
      style={{ background:'linear-gradient(180deg,rgba(126,200,245,0.95),rgba(184,228,249,0.95))' }}>
      <div className="text-2xl font-black text-white mb-1 drop-shadow-lg"
        style={{ textShadow:'2px 2px 0 rgba(0,0,0,0.3)' }}>
        PICK {remaining} CHEST{remaining!==1?'S':''}!
      </div>
      <div className="text-sm text-white/70 mb-6">Choose your powerups before launch</div>
      <div className="flex gap-5">
        {Object.entries(CHEST_TYPES).map(([type, def]) => {
          const picked = chestsPicked.filter(t=>t===type).length;
          return (
            <button key={type} onClick={() => onPick(type)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-3 transition-all hover:scale-110 active:scale-95 shadow-xl"
              style={{ borderColor:def.color, background:'rgba(200,160,80,0.9)', border:`3px solid ${def.color}` }}>
              <div className="text-5xl">{def.emoji}</div>
              <div className="font-black text-base" style={{ color:def.color, textShadow:'1px 1px 0 rgba(0,0,0,0.4)' }}>
                {def.label}
              </div>
              {picked > 0 && (
                <div className="text-xs font-bold text-white bg-green-600 px-2 py-0.5 rounded-full">✓ picked</div>
              )}
            </button>
          );
        })}
      </div>
      {chestsPicked.length > 0 && (
        <div className="mt-5 flex gap-2">
          {chestsPicked.map((t,i) => (
            <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow"
              style={{ background:`${CHEST_TYPES[t].color}55`, border:`2px solid ${CHEST_TYPES[t].color}` }}>
              {CHEST_TYPES[t].emoji}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tap to shoot screen ────────────────────────────────────────────────────
function TapToShoot({ chargeLevel }) {
  const pct = chargeLevel / CHARGE_MAX;
  if (pct > 0.05) return null; // hide once charging starts
  return (
    <g>
      <text x={CW/2} y={CH/2 - 20} textAnchor="middle" fontSize={32} fontWeight="900"
        fontFamily="Arial Black,sans-serif" fill="white"
        stroke="rgba(0,0,0,0.4)" strokeWidth={3} paintOrder="stroke">
        Tap To
      </text>
      <text x={CW/2} y={CH/2 + 20} textAnchor="middle" fontSize={32} fontWeight="900"
        fontFamily="Arial Black,sans-serif" fill="white"
        stroke="rgba(0,0,0,0.4)" strokeWidth={3} paintOrder="stroke">
        Shoot!
      </text>
    </g>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function CannonGame({ engine }) {
  const {
    phase, chestsPicked, multipliers, chargeLevel, fuelsLeft,
    ballWx, ballWy, ballRot, camWx, currentDist, finalScore, bestScore,
    obstacles, explosions, hitEffects, activeBoost, trajectory, floorZone,
    pickChest, startHold, endHold, shooter,
  } = engine;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#c8943a]"
        style={{ height: CH }}>

        {phase === 'chest_pick' && <ChestPicker chestsPicked={chestsPicked} onPick={pickChest}/>}

        <svg width="100%" height={CH} viewBox={`0 0 ${CW} ${CH}`}
          preserveAspectRatio="xMidYMid meet">

          {/* Sky + clouds + balloons */}
          <SkyBackground camWx={camWx}/>

          {/* Platform */}
          <Platform camWx={camWx}/>

          {/* Distance markers (colored circles) */}
          <DistanceMarkers camWx={camWx}/>

          {/* Obstacles */}
          {obstacles.map(ob => <Obstacle key={ob.id} ob={ob} camWx={camWx}/>)}

          {/* Explosions */}
          {explosions.map(ex => <Explosion key={ex.id} ex={ex} camWx={camWx}/>)}

          {/* Hit labels */}
          {hitEffects.map(ef => <HitEffect key={ef.id} ef={ef} camWx={camWx}/>)}

          {/* Trajectory arc (while charging) */}
          {phase === 'charging' && <TrajectoryArc points={trajectory} camWx={camWx}/>}

          {/* Ball + username */}
          <Ball wx={ballWx} wy={ballWy} rot={ballRot}
            phase={phase} camWx={camWx} username={shooter}/>

          {/* Cannon (fixed left) */}
          <Cannon chargeLevel={chargeLevel} phase={phase}/>

          {/* "Tap to Shoot" hint */}
          {phase === 'charging' && <TapToShoot chargeLevel={chargeLevel}/>}

          {/* Multiplier HUD (top-left, like real game) */}
          <MultiplierHUD multipliers={multipliers} phase={phase} score={currentDist}/>

          {/* Score HUD (top center) */}
          {(phase === 'in_flight' || phase === 'rolling' || phase === 'landed') && (
            <ScoreHUD score={finalScore} dist={currentDist} phase={phase}/>
          )}

          {/* Charge bar (center, near bottom) */}
          <ChargeBarHUD chargeLevel={chargeLevel} phase={phase}/>

          {/* Best score top-right */}
          {bestScore > 0 && (
            <g transform={`translate(${CW - 110}, 10)`}>
              <rect x={0} y={0} width={100} height={36} rx={6}
                fill="rgba(240,230,180,0.92)" stroke="#8b6914" strokeWidth={2}/>
              <text x={50} y={23} textAnchor="middle" fontSize={13} fontWeight="900"
                fill="#cc8800" fontFamily="Arial Black,sans-serif">🏆 {bestScore}</text>
            </g>
          )}

          {/* Fuels remaining */}
          {fuelsLeft > 0 && phase === 'landed' && (
            <g transform={`translate(${CW/2 - 65}, ${CH - 50})`}>
              <rect x={0} y={0} width={130} height={32} rx={8}
                fill="rgba(255,100,0,0.9)" stroke="#cc5500" strokeWidth={2}/>
              <text x={65} y={22} textAnchor="middle" fontSize={13} fontWeight="900"
                fill="white" fontFamily="Arial Black,sans-serif">
                🔥 {fuelsLeft} SHOT{fuelsLeft!==1?'S':''} LEFT!
              </text>
            </g>
          )}
        </svg>

        {/* Boost popup */}
        {activeBoost && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="px-5 py-2.5 rounded-2xl font-black text-lg text-black text-center animate-bounce shadow-2xl"
              style={{ background:activeBoost.color, boxShadow:`0 0 28px ${activeBoost.color}99` }}>
              {activeBoost.emoji} {activeBoost.label}
              {activeBoost.user && <div className="text-xs opacity-75">from @{activeBoost.user}</div>}
            </div>
          </div>
        )}

        {/* Final score */}
        {phase === 'landed' && finalScore > 0 && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
            <div className="text-7xl font-black drop-shadow-2xl"
              style={{ color:'#ffcc00', textShadow:'3px 3px 0 rgba(0,0,0,0.4), 0 0 40px #ffaa0088' }}>
              {finalScore}
            </div>
            <div className="text-white font-black text-xl mt-1 drop-shadow-lg">POINTS!</div>
            <div className="text-white/70 text-sm">{currentDist}m · {floorZone.label} zone</div>
          </div>
        )}
      </div>

      {/* Charge / fire button */}
      {phase === 'charging' && (
        <button
          onMouseDown={startHold} onMouseUp={endHold}
          onTouchStart={startHold} onTouchEnd={endHold}
          className="w-full py-4 rounded-2xl font-black text-xl tracking-widest select-none transition-all active:scale-95"
          style={{
            background: chargeLevel >= CHARGE_THRESHOLD
              ? 'linear-gradient(135deg,#ff8800,#ff2222)'
              : 'linear-gradient(135deg,#4488aa,#2266aa)',
            border: `3px solid ${chargeLevel >= CHARGE_THRESHOLD ? '#ff8800' : '#336688'}`,
            color: 'white',
            boxShadow: chargeLevel >= CHARGE_THRESHOLD ? '0 0 30px #ff880088' : 'none',
          }}>
          {chargeLevel < CHARGE_THRESHOLD ? '⚡ HOLD TO CHARGE' : '🔥 RELEASE TO FIRE!'}
        </button>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          ['Distance', currentDist ? `${currentDist}m` : '—', 'text-cyan-400'],
          ['Score',    finalScore || (currentDist > 0 ? Math.round(currentDist * (floorZone?.mult||1) * 10) : '—'), 'text-yellow-400'],
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
