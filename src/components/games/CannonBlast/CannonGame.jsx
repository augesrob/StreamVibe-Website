/**
 * CannonGame v6 — Ball Guys Cannon Climb renderer
 * 25° static incline. Ball rolls UP. Enemy cannons fire DOWN.
 * Uses s2c(su, py, camSU) for all world→canvas mapping.
 * Camera lerps smoothly — follows ball even when knocked back.
 */
import React from 'react';

const CANVAS_W  = 860;
const CANVAS_H  = 340;
const PX        = 20;
const SLOPE_DEG = 25;
const SLOPE_RAD = (SLOPE_DEG * Math.PI) / 180;
const COS       = Math.cos(SLOPE_RAD);
const SIN       = Math.sin(SLOPE_RAD);
const ORIG_X    = 55;
const ORIG_Y    = CANVAS_H - 40;
const BALL_R_PX = 11;

/**
 * s2c — Slope Units → Canvas pixels
 * @param {number} su    — distance along slope
 * @param {number} py    — height perp to slope
 * @param {number} camSU — camera position in SU
 */
function s2c(su, py, camSU) {
  const rel = su - camSU;
  return {
    cx: ORIG_X + rel * COS * PX - py * SIN * PX,
    cy: ORIG_Y - rel * SIN * PX - py * COS * PX,
  };
}

function SlopeSurface({ camSU }) {
  const pts = [];
  for (let su = -5; su <= 300; su += 3) {
    const { cx, cy } = s2c(su, 0, camSU);
    pts.push(`${cx.toFixed(1)},${cy.toFixed(1)}`);
  }
  const last  = s2c(300, 0, camSU);
  const first = s2c(-5,  0, camSU);
  const fill  = `${pts.join(' ')} ${last.cx},${CANVAS_H+10} ${first.cx},${CANVAS_H+10}`;
  const markers = [];
  for (let m = 0; m <= 300; m += 10) {
    const { cx, cy } = s2c(m, 0, camSU);
    if (cx < -10 || cx > CANVAS_W + 10) continue;
    markers.push(
      <g key={m}>
        <line x1={cx+SIN*5} y1={cy+COS*5} x2={cx-SIN*5} y2={cy-COS*5} stroke="#7a5a28" strokeWidth={1.5}/>
        <text x={cx-SIN*14} y={cy+COS*14+3} textAnchor="middle" fontSize={9} fill="#a07838">{m}m</text>
      </g>
    );
  }
  const alcoves = [30,78,145,215].map((su,i) => {
    const { cx, cy } = s2c(su, 0, camSU);
    if (cx < -30 || cx > CANVAS_W + 30) return null;
    return (
      <g key={i} transform={`translate(${cx},${cy})`}>
        <ellipse cx={0} cy={-14} rx={18} ry={10} fill="#0a2800" stroke="#22cc44" strokeWidth={2} opacity={0.9}/>
        <text x={0} y={-10} textAnchor="middle" fontSize={11}>🛡</text>
      </g>
    );
  }).filter(Boolean);
  return (
    <>
      <polygon points={fill} fill="#2e1a08"/>
      <polyline points={pts.join(' ')} fill="none" stroke="#5a3818" strokeWidth={6}/>
      <polyline points={pts.join(' ')} fill="none" stroke="#3a6a18" strokeWidth={3}/>
      {markers}{alcoves}
    </>
  );
}

function EnemyCannon({ su, camSU, telegraph, type }) {
  const { cx, cy } = s2c(su, 0, camSU);
  if (cx < -60 || cx > CANVAS_W + 60) return null;
  const col   = { standard:'#cc2200', bouncy:'#7c4dff', explosive:'#ff5500' }[type] ?? '#cc2200';
  const icon  = { standard:'🔴', bouncy:'🟣', explosive:'💥' }[type];
  const flash = telegraph > 0;
  return (
    <g transform={`translate(${cx},${cy}) rotate(${-SLOPE_DEG})`}>
      {flash && <circle r={24} fill={col} opacity={0.28}><animate attributeName="opacity" values="0.12;0.45;0.12" dur="0.35s" repeatCount="indefinite"/></circle>}
      <rect x={-14} y={-8} width={28} height={12} rx={4} fill="#1a0c06" stroke="#3a200a" strokeWidth={2}/>
      <g transform="rotate(180)">
        <rect x={2} y={-7} width={40} height={14} rx={7} fill="#111" stroke="#444" strokeWidth={1.5}/>
        <rect x={38} y={-8.5} width={8} height={17} rx={3} fill="#0a0a0a" stroke="#333" strokeWidth={1.5}/>
        {flash && <ellipse cx={50} cy={0} rx={10} ry={7} fill={col} opacity={0.9}><animate attributeName="rx" values="6;14;6" dur="0.25s" repeatCount="indefinite"/></ellipse>}
      </g>
      <text x={0} y={-20} textAnchor="middle" fontSize={13}>{icon}</text>
    </g>
  );
}

function Projectile({ su, py, r, color, type, camSU }) {
  const { cx, cy } = s2c(su, py, camSU);
  if (cx < -30 || cx > CANVAS_W + 30) return null;
  const glow = type === 'explosive' ? 10 : 4;
  return (
    <g transform={`translate(${cx},${cy})`}>
      <circle r={r*PX} fill={color} stroke="rgba(0,0,0,0.45)" strokeWidth={1.5} style={{ filter:`drop-shadow(0 0 ${glow}px ${color})` }}/>
      {type==='explosive' && <circle r={r*PX*0.5} fill="#ffcc00" opacity={0.85}/>}
      {type==='bouncy'    && <circle r={r*PX*0.4} fill="rgba(255,255,255,0.22)"/>}
      <line x1={0} y1={0} x2={r*PX+10} y2={0} stroke={color} strokeWidth={2} opacity={0.35}/>
    </g>
  );
}

function Explosion({ su, py, r, color, camSU }) {
  const { cx, cy } = s2c(su, py??0, camSU);
  const rpx = r * PX;
  return (
    <g transform={`translate(${cx},${cy})`}>
      <circle r={rpx}     fill={color} opacity={0.22}/>
      <circle r={rpx*0.6} fill={color} opacity={0.5}/>
      <circle r={rpx*0.3} fill="#fff"  opacity={0.8}/>
      {[0,60,120,180,240,300].map((d,i)=>{
        const rad=(d*Math.PI)/180;
        return <line key={i} x1={0} y1={0} x2={Math.cos(rad)*rpx*0.85} y2={Math.sin(rad)*rpx*0.85} stroke={color} strokeWidth={2.5} opacity={0.7}/>;
      })}
    </g>
  );
}

/**
 * BlastParticles — 14 radial sparks spawned when an explosive hits the ground.
 * Each particle uses the same s2c() coordinate system as everything else,
 * so they correctly appear on the inclined slope surface.
 *
 * Particle shape: { id, su, dsu, dpy, r, color }
 *   su  — spawn position along slope
 *   dsu — offset along slope (spread)
 *   dpy — height above slope (bounce arc)
 *   r   — radius in SU
 */
function BlastParticles({ particles, camSU }) {
  if (!particles.length) return null;
  return (
    <>
      {particles.map(p => {
        const { cx, cy } = s2c(p.su + p.dsu, p.dpy, camSU);
        if (cx < -20 || cx > CANVAS_W + 20) return null;
        const rpx = Math.max(2, p.r * PX);
        return (
          <g key={p.id} transform={`translate(${cx},${cy})`}>
            {/* Core spark */}
            <circle r={rpx} fill={p.color} opacity={0.9}
              style={{ filter:`drop-shadow(0 0 ${rpx+2}px ${p.color})` }}>
              <animate attributeName="opacity" values="0.9;0.6;0" dur="0.65s" fill="freeze"/>
              <animate attributeName="r"       values={`${rpx};${rpx*0.4};0`} dur="0.65s" fill="freeze"/>
            </circle>
            {/* Inner white flash */}
            <circle r={rpx*0.5} fill="#fff" opacity={0.8}>
              <animate attributeName="opacity" values="0.8;0" dur="0.25s" fill="freeze"/>
            </circle>
          </g>
        );
      })}
    </>
  );
}

function PlayerBall({ su, py, phase, rotation, camSU }) {
  if (phase === 'idle' || phase === 'aiming') return null;
  const { cx, cy } = s2c(su, py??0, camSU);
  const isStun = phase === 'stun';
  return (
    <g transform={`translate(${cx},${cy}) rotate(${rotation})`}>
      {isStun && (
        <circle r={22} fill="rgba(255,30,30,0.15)" stroke="rgba(255,30,30,0.5)" strokeWidth={2}>
          <animate attributeName="r" values="18;26;18" dur="0.35s" repeatCount="indefinite"/>
        </circle>
      )}
      <circle r={BALL_R_PX} fill={isStun?'#bb1a00':'#dcdcdc'} stroke={isStun?'#ff4444':'#888'} strokeWidth={2}
        style={{ filter:'drop-shadow(0 3px 6px rgba(0,0,0,0.65))' }}/>
      <g transform={`rotate(${-rotation})`}>
        {isStun ? (
          <>
            <line x1={-5} y1={-5} x2={-2} y2={-2} stroke="white" strokeWidth={2.5}/>
            <line x1={-2} y1={-5} x2={-5} y2={-2} stroke="white" strokeWidth={2.5}/>
            <line x1={2}  y1={-5} x2={5}  y2={-2} stroke="white" strokeWidth={2.5}/>
            <line x1={5}  y1={-5} x2={2}  y2={-2} stroke="white" strokeWidth={2.5}/>
            <path d="M -4 4 Q 0 1 4 4" stroke="white" strokeWidth={2} fill="none"/>
          </>
        ) : (
          <>
            <circle cx={-4} cy={-4} r={3.5} fill="rgba(0,0,0,0.75)"/>
            <circle cx={4}  cy={-4} r={3.5} fill="rgba(0,0,0,0.75)"/>
            <path d="M -4 3 Q 0 6 4 3" stroke="rgba(0,0,0,0.75)" strokeWidth={2} fill="none" strokeLinecap="round"/>
          </>
        )}
      </g>
      {phase==='climbing' && (
        <>
          <line x1={-BALL_R_PX} y1={-2} x2={-BALL_R_PX-18} y2={-2} stroke="rgba(255,255,255,0.55)" strokeWidth={2.5}/>
          <line x1={-BALL_R_PX} y1={4}  x2={-BALL_R_PX-11} y2={4}  stroke="rgba(255,255,255,0.35)" strokeWidth={2}/>
        </>
      )}
    </g>
  );
}

function LaunchCannon({ barrelAngle, phase, camSU }) {
  if (camSU > 6) return null;
  const isAiming = phase === 'aiming';
  return (
    <g transform={`translate(${ORIG_X-8},${ORIG_Y})`}>
      <circle cx={-2} cy={5} r={14} fill="#221408" stroke="#4a2a10" strokeWidth={2}/>
      <circle cx={26} cy={5} r={14} fill="#221408" stroke="#4a2a10" strokeWidth={2}/>
      <rect x={-12} y={-7} width={50} height={16} rx={4} fill="#160e04" stroke="#3a2008" strokeWidth={2}/>
      <g transform={`rotate(${-(barrelAngle+SLOPE_DEG)},12,-2)`}>
        <rect x={8} y={-8} width={52} height={16} rx={8} fill="#0e0e0e" stroke="#444" strokeWidth={2}/>
        <rect x={54} y={-10} width={9} height={20} rx={4} fill="#090909" stroke="#333" strokeWidth={2}/>
      </g>
      {(phase==='aiming'||phase==='idle'||phase==='landed') && (
        <g>
          <path d="M 12 -7 Q 17 -20 23 -14" stroke="#7a3a0a" strokeWidth={2.5} fill="none" strokeLinecap="round"/>
          <circle cx={23} cy={-14} r={3.5} fill={isAiming?'#ff6600':'#882200'}>
            {isAiming && <animate attributeName="r" values="2.5;5;2.5" dur="0.18s" repeatCount="indefinite"/>}
          </circle>
        </g>
      )}
      {phase==='climbing' && (
        <g transform={`rotate(${-(barrelAngle+SLOPE_DEG)},12,-2)`}>
          <ellipse cx={68} cy={0} rx={15} ry={9} fill="#ff5500" opacity={0.9}/>
          <ellipse cx={68} cy={0} rx={9}  ry={5} fill="#ffbb00" opacity={0.95}/>
        </g>
      )}
    </g>
  );
}

export default function CannonGame({ engine }) {
  const {
    phase, barrelAngle, ballSU, ballPY, rotation, camSU,
    currentDistance, maxDistance, stunTimeLeft,
    activeBoost, projectiles, explosions, blastParticles, cannons, leaderboard,
  } = engine;
  const stunPct = Math.max(0, 1 - stunTimeLeft / 1500);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#1e2240]"
        style={{ height:CANVAS_H, background:'linear-gradient(180deg,#162050 0%,#1e408a 40%,#3a78b8 80%,#5aa0c8 100%)' }}>
        <svg width="100%" height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#162050"/><stop offset="55%" stopColor="#2860a8"/>
              <stop offset="100%" stopColor="#5aa0c8"/>
            </linearGradient>
          </defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#sk)"/>
          <polygon points="0,270 80,155 160,235 240,135 320,215 400,115 480,195 560,105 640,185 720,95 800,175 860,115 860,340 0,340" fill="#1a3860" opacity={0.55}/>
          <polygon points="0,295 100,195 200,255 300,175 400,235 500,155 600,215 700,145 800,205 860,155 860,340 0,340" fill="#152d50" opacity={0.45}/>
          {[[90,44],[250,26],[440,50],[640,32],[800,46]].map(([x,y],i)=>(
            <g key={i} transform={`translate(${x},${y})`} opacity={0.45}>
              <ellipse cx={0} cy={0} rx={28} ry={16} fill="white"/>
              <ellipse cx={20} cy={-5} rx={20} ry={12} fill="white"/>
              <ellipse cx={-18} cy={-4} rx={18} ry={11} fill="white"/>
            </g>
          ))}

          <SlopeSurface camSU={camSU}/>
          <LaunchCannon barrelAngle={barrelAngle} phase={phase} camSU={camSU}/>
          {cannons.map(c=><EnemyCannon key={c.id} su={c.su} camSU={camSU} telegraph={c.telegraph} type={c.type}/>)}
          {explosions.map(e=><Explosion key={e.id} su={e.su} py={e.py} r={e.r} color={e.color} camSU={camSU}/>)}

          {/* Blast particles — spawned when explosive hits slope surface */}
          <BlastParticles particles={blastParticles??[]} camSU={camSU}/>

          {projectiles.map(p=><Projectile key={p.id} su={p.su} py={p.py} r={p.r} color={p.color} type={p.type} camSU={camSU}/>)}
          <PlayerBall su={ballSU} py={ballPY} phase={phase} rotation={rotation} camSU={camSU}/>

          {(phase==='climbing'||phase==='stun') && (
            <g>
              <rect x={CANVAS_W-122} y={10} width={112} height={36} rx={8} fill="rgba(0,0,0,0.72)" stroke="rgba(255,215,0,0.5)" strokeWidth={1.5}/>
              <text x={CANVAS_W-66} y={33} textAnchor="middle" fontSize={20} fontWeight="900" fill="#ffd700" fontFamily="monospace">{currentDistance}m</text>
            </g>
          )}
          {maxDistance>0 && (
            <g>
              <rect x={10} y={10} width={96} height={30} rx={7} fill="rgba(0,0,0,0.65)" stroke="rgba(255,215,0,0.3)" strokeWidth={1}/>
              <text x={58} y={30} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#ffd700">🏆 {maxDistance}m</text>
            </g>
          )}
          {phase==='aiming' && (
            <g>
              <rect x={CANVAS_W/2-95} y={14} width={190} height={34} rx={10} fill="rgba(255,90,0,0.92)" stroke="#ff5500" strokeWidth={2}/>
              <text x={CANVAS_W/2} y={36} textAnchor="middle" fontSize={16} fontWeight="900" fill="white">🎯 AIMING...</text>
            </g>
          )}
          {phase==='stun' && (
            <g>
              <rect x={CANVAS_W/2-85} y={14} width={170} height={26} rx={7} fill="rgba(0,0,0,0.78)" stroke="#ff3333" strokeWidth={2}/>
              <rect x={CANVAS_W/2-83} y={16} width={166*stunPct} height={22} rx={6} fill="#ff3333"/>
              <text x={CANVAS_W/2} y={32} textAnchor="middle" fontSize={11} fontWeight="bold" fill="white">😵 RECOVERING...</text>
            </g>
          )}
          {leaderboard.length>0 && (phase==='idle'||phase==='landed') && (
            <g transform="translate(10,50)">
              <rect x={0} y={0} width={135} height={20+leaderboard.length*20} rx={8} fill="rgba(0,0,0,0.75)" stroke="rgba(255,215,0,0.4)" strokeWidth={1.5}/>
              <text x={67} y={15} textAnchor="middle" fontSize={10} fill="#ffd700" fontWeight="bold">TOP 3</text>
              {leaderboard.slice(0,3).map((e,i)=>(
                <g key={e.user} transform={`translate(8,${20+i*20})`}>
                  <text x={0} y={0} fontSize={10} fill={['#ffd700','#c0c0c0','#cd7f32'][i]}>{['🥇','🥈','🥉'][i]} @{e.user} — {e.distance}m</text>
                </g>
              ))}
            </g>
          )}
        </svg>

        {activeBoost && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="px-5 py-2.5 rounded-2xl font-black text-lg text-black text-center animate-bounce"
              style={{ background:activeBoost.color, boxShadow:`0 0 28px ${activeBoost.color}99` }}>
              {activeBoost.emoji} {activeBoost.label}
              {activeBoost.user && <div className="text-xs opacity-75">from @{activeBoost.user}</div>}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          ['Distance', currentDistance?`${currentDistance}m`:'—','text-cyan-400'],
          ['Record',   maxDistance?`${maxDistance}m`:'—',        'text-yellow-400'],
          ['Phase',    phase.toUpperCase(), phase==='stun'?'text-red-400':phase==='climbing'?'text-green-400':'text-orange-400'],
          ['Cannons',  String(cannons.length),'text-red-400'],
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
