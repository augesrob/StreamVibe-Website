/**
 * CannonGame v9 — Ball Guys: Cannon Mode
 * Gummy bear ball, sky background, platform with distance rings
 */
import React from 'react';
import { PX_PER_WU, FLOOR_ZONES, CHARGE_MAX, CHARGE_THRESHOLD, CHEST_TYPES } from '@/hooks/useCannonEngine';

const CW     = 900;
const CH     = 480;
const PX     = PX_PER_WU;
const PLAT_Y = CH - 80;
const PLAT_H = 50;
const BALL_R = 13;
const CANNON_CX = 90;

function wx2cx(wx, camWx) { return CANNON_CX + (wx - camWx) * PX; }
function wy2cy(wy)         { return PLAT_Y - wy * PX; }

// ── SVG Gummy Bear ────────────────────────────────────────────────────
function GummyBear({ cx, cy, r, rot, color = '#ff6b9d', username }) {
  const s = r / 11;
  return (
    <g transform={`translate(${cx},${cy}) rotate(${rot})`}>
      {/* Shadow */}
      <ellipse cx={0} cy={r + 4} rx={r * 0.9} ry={4} fill="rgba(0,0,0,0.3)" transform={`rotate(${-rot})`}/>
      {/* Body */}
      <ellipse cx={0} cy={2*s} rx={9*s} ry={10*s} fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth={1}/>
      {/* Head */}
      <circle cx={0} cy={-9*s} r={8*s} fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth={1}/>
      {/* Ears */}
      <circle cx={-6*s} cy={-16*s} r={3.5*s} fill={color}/>
      <circle cx={ 6*s} cy={-16*s} r={3.5*s} fill={color}/>
      {/* Eyes */}
      <circle cx={-3*s} cy={-10*s} r={2*s} fill="rgba(0,0,0,0.8)"/>
      <circle cx={ 3*s} cy={-10*s} r={2*s} fill="rgba(0,0,0,0.8)"/>
      {/* Eye glint */}
      <circle cx={-2*s} cy={-11*s} r={0.8*s} fill="white"/>
      <circle cx={ 4*s} cy={-11*s} r={0.8*s} fill="white"/>
      {/* Nose */}
      <ellipse cx={0} cy={-7*s} rx={1.5*s} ry={1*s} fill="rgba(0,0,0,0.5)"/>
      {/* Smile */}
      <path d={`M ${-3*s} ${-5*s} Q 0 ${-2*s} ${3*s} ${-5*s}`}
        stroke="rgba(0,0,0,0.6)" strokeWidth={1.2*s} fill="none" strokeLinecap="round"/>
      {/* Arms */}
      <ellipse cx={-11*s} cy={-2*s} rx={3*s} ry={5*s} fill={color} transform={`rotate(-25,${-11*s},${-2*s})`}/>
      <ellipse cx={ 11*s} cy={-2*s} rx={3*s} ry={5*s} fill={color} transform={`rotate( 25,${11*s},${-2*s})`}/>
      {/* Legs */}
      <ellipse cx={-4*s} cy={12*s} rx={3.5*s} ry={5*s} fill={color}/>
      <ellipse cx={ 4*s} cy={12*s} rx={3.5*s} ry={5*s} fill={color}/>
      {/* Shine */}
      <ellipse cx={-3*s} cy={-1*s} rx={2.5*s} ry={4*s} fill="rgba(255,255,255,0.18)" transform="rotate(-20,-3,0)"/>

      {/* Username label */}
      {username && (
        <g transform={`rotate(${-rot}) translate(0,${-24*s})`}>
          <rect x={-40} y={-11} width={80} height={16} rx={5}
            fill="rgba(0,0,0,0.7)" stroke="rgba(255,255,255,0.3)" strokeWidth={1}/>
          <text textAnchor="middle" y={1} fontSize={9} fill="white" fontWeight="900"
            fontFamily="Arial Black,Impact,sans-serif">@{username.slice(0,12)}</text>
        </g>
      )}
    </g>
  );
}

// ── Sky ────────────────────────────────────────────────────────────────
function Sky({ camWx }) {
  const clouds = [
    {x:100,y:55,s:1.1},{x:300,y:35,s:0.8},{x:520,y:68,s:1.3},
    {x:700,y:42,s:0.9},{x:840,y:78,s:1.0},{x:160,y:130,s:0.65},
    {x:420,y:108,s:1.2},{x:640,y:138,s:0.75},{x:770,y:98,s:1.0},
  ];
  const p1 = (camWx * 0.18) % (CW + 300);
  return (
    <>
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#5ab4e8"/>
          <stop offset="55%"  stopColor="#92d3f0"/>
          <stop offset="100%" stopColor="#c8eef8"/>
        </linearGradient>
      </defs>
      <rect width={CW} height={CH} fill="url(#skyG)"/>
      {clouds.map((c,i) => {
        const cx = ((c.x - p1 * 0.4 + CW*3) % (CW+260))-130;
        return (
          <g key={i} transform={`translate(${cx},${c.y}) scale(${c.s})`} opacity={0.88}>
            <ellipse cx={0} cy={0} rx={40} ry={24} fill="white"/>
            <ellipse cx={30} cy={-9} rx={30} ry={22} fill="white"/>
            <ellipse cx={-28} cy={-7} rx={26} ry={20} fill="white"/>
          </g>
        );
      })}
      {/* Hot air balloons */}
      {[{bx:340,by:155,p:0.12,c1:'#ff6b35',c2:'#ffd700'},{bx:700,by:195,p:0.22,c1:'#44cc88',c2:'#ffeeaa'}].map((b,i)=>{
        const bx = ((b.bx - camWx*b.p + CW*4) % (CW+440))-220;
        return (
          <g key={i} transform={`translate(${bx},${b.by})`}>
            <ellipse cx={0} cy={0} rx={30} ry={36} fill={b.c1} stroke={b.c2} strokeWidth={2}/>
            {[-15,0,15].map((x,j)=>(<line key={j} x1={x} y1={-36} x2={x} y2={36} stroke={b.c2} strokeWidth={1.5} opacity={0.5}/>))}
            <rect x={-9} y={37} width={18} height={12} rx={2} fill="#8b6914" stroke="#5a4510" strokeWidth={1.5}/>
            <line x1={-9} y1={36} x2={-7} y2={47} stroke="#8b6914" strokeWidth={1.2}/>
            <line x1={9}  y1={36} x2={7}  y2={47} stroke="#8b6914" strokeWidth={1.2}/>
          </g>
        );
      })}
    </>
  );
}

// ── Platform ──────────────────────────────────────────────────────────
function Platform({ camWx }) {
  const planks = [];
  for (let wx = -8; wx < 320; wx += 4) {
    const x1 = wx2cx(wx, camWx);
    const x2 = wx2cx(wx+4, camWx);
    if (x2 < -5 || x1 > CW+5) continue;
    planks.push(<rect key={wx} x={x1} y={PLAT_Y} width={Math.max(0,x2-x1-1)} height={PLAT_H}
      fill={wx%8===0?'#c8943a':'#d4a044'} stroke="#a07030" strokeWidth={0.5}/>);
  }
  // Nails
  const nails = [];
  for (let wx = 2; wx < 320; wx += 8) {
    const cx = wx2cx(wx, camWx);
    if (cx<0||cx>CW) continue;
    nails.push(<circle key={`n${wx}`} cx={cx} cy={PLAT_Y+8} r={2.5} fill="#7a5020"/>);
  }
  // Distance rings (circular markers on platform)
  const rings = [];
  for (let m = 20; m <= 300; m += 20) {
    const cx = wx2cx(m, camWx);
    if (cx < -20 || cx > CW+20) continue;
    const isHundred = m % 100 === 0;
    rings.push(
      <g key={`ring${m}`}>
        <line x1={cx} y1={PLAT_Y-2} x2={cx} y2={PLAT_Y-18} stroke={isHundred?'#ffe066':'rgba(255,255,255,0.5)'}
          strokeWidth={isHundred?2.5:1.5}/>
        <text x={cx} y={PLAT_Y-22} textAnchor="middle" fontSize={isHundred?12:9}
          fill={isHundred?'#ffe066':'rgba(255,255,255,0.7)'} fontWeight={isHundred?'900':'400'}
          fontFamily="Arial Black,Impact,sans-serif">{m}m</text>
      </g>
    );
  }
  return <>{planks}{nails}{rings}</>;
}

// ── Cannon ────────────────────────────────────────────────────────────
function Cannon({ chargeLevel }) {
  const angleDeg = -38 - (chargeLevel / CHARGE_MAX) * 4;
  return (
    <g transform={`translate(${CANNON_CX},${PLAT_Y})`}>
      {/* Wheels */}
      <circle cx={-14} cy={8} r={16} fill="#1a1008" stroke="#5a3010" strokeWidth={3}/>
      <circle cx={ 14} cy={8} r={16} fill="#1a1008" stroke="#5a3010" strokeWidth={3}/>
      <circle cx={-14} cy={8} r={7}  fill="#2a1808"/>
      <circle cx={ 14} cy={8} r={7}  fill="#2a1808"/>
      {/* Spokes */}
      {[0,60,120,180,240,300].map(a=>(
        <g key={a}>
          <line x1={-14+Math.cos(a*Math.PI/180)*7} y1={8+Math.sin(a*Math.PI/180)*7}
                x2={-14+Math.cos(a*Math.PI/180)*16} y2={8+Math.sin(a*Math.PI/180)*16}
                stroke="#3a2010" strokeWidth={2}/>
          <line x1={ 14+Math.cos(a*Math.PI/180)*7} y1={8+Math.sin(a*Math.PI/180)*7}
                x2={ 14+Math.cos(a*Math.PI/180)*16} y2={8+Math.sin(a*Math.PI/180)*16}
                stroke="#3a2010" strokeWidth={2}/>
        </g>
      ))}
      {/* Carriage */}
      <rect x={-26} y={-12} width={60} height={22} rx={7} fill="#120c04" stroke="#3a2008" strokeWidth={2}/>
      {/* Barrel */}
      <g transform={`rotate(${angleDeg},10,-5)`}>
        <rect x={4} y={-11} width={68} height={22} rx={11} fill="#0e0e0e" stroke="#555" strokeWidth={2.5}/>
        {/* Muzzle flash when launched */}
        <circle cx={78} cy={0} r={14} fill="#ff8800" opacity={0.5}
          style={{ filter:'blur(3px)' }}/>
      </g>
      {/* Charge indicator light */}
      {chargeLevel > 0 && (
        <circle cx={10} cy={-18} r={5}
          fill={chargeLevel < 40?'#00e5ff':chargeLevel<70?'#ffd600':chargeLevel<90?'#ff6d00':'#ff1744'}
          opacity={0.9}/>
      )}
    </g>
  );
}

// ── Obstacles ─────────────────────────────────────────────────────────
function Obstacles({ obstacles, camWx }) {
  return (
    <>
      {obstacles.filter(o=>o.active).map(o => {
        const cx = wx2cx(o.wx, camWx);
        const cy = wy2cy(o.wy);
        if (cx<-20||cx>CW+20) return null;
        if (o.type === 'bomb') return (
          <g key={o.id} transform={`translate(${cx},${cy})`}>
            <circle cx={0} cy={0} r={10} fill="#222" stroke="#555" strokeWidth={2}/>
            <line x1={0} y1={-10} x2={3} y2={-18} stroke="#aaa" strokeWidth={2}/>
            <circle cx={4} cy={-19} r={3} fill="#ff8800" opacity={0.9}/>
          </g>
        );
        if (o.type === 'bouncer') return (
          <g key={o.id} transform={`translate(${cx},${cy})`}>
            <ellipse cx={0} cy={0} rx={12} ry={8} fill="#ffd700" stroke="#cc9900" strokeWidth={2}/>
            <text textAnchor="middle" y={4} fontSize={10} fontWeight="900">🟡</text>
          </g>
        );
        return null;
      })}
    </>
  );
}

// ── Charge Bar ───────────────────────────────────────────────────────
function ChargeBar({ chargeLevel }) {
  const pct = chargeLevel / CHARGE_MAX;
  const col = pct<0.35?'#00e5ff':pct<0.65?'#ffd600':pct<0.88?'#ff6d00':'#ff1744';
  const pulseStyle = pct >= 0.99 ? { animation:'pulse 0.3s ease-in-out infinite alternate' } : {};
  return (
    <g transform={`translate(${CW/2-140},20)`}>
      <rect x={0} y={0} width={280} height={32} rx={10} fill="rgba(0,0,0,0.8)" stroke="rgba(255,255,255,0.2)" strokeWidth={2}/>
      <rect x={4} y={4} width={272*pct} height={24} rx={8} fill={col} style={pulseStyle}/>
      <text x={140} y={22} textAnchor="middle" fontSize={12} fontWeight="900" fill="white"
        fontFamily="Arial Black,Impact,sans-serif" style={{ textShadow:'0 1px 4px rgba(0,0,0,0.9)' }}>
        {pct < 0.25 ? '🎁 GIFT TO CHARGE!' : pct < 0.99 ? `⚡ ${Math.round(pct*100)}% CHARGED` : '🔥 FULL POWER!'}
      </text>
    </g>
  );
}

// ── Main CannonGame export ────────────────────────────────────────────
export default function CannonGame({ engine }) {
  const { phase, ballWx, ballWy, ballRot, ballUser, camWx,
          chargeLevel, currentDist, finalScore, bestScore,
          obstacles, activeBoost, floorZone, leaderboard,
          auctionBids, auctionWinner, showChestPick,
          pickChest, endAuction, startNewRound, manualLaunch } = engine;

  const showBall = phase === 'in_flight' || phase === 'rolling' || phase === 'landed';
  const ballCx   = wx2cx(ballWx, camWx);
  const ballCy   = wy2cy(ballWy);

  // Gummy bear colour by floor zone
  const bearColors = ['#ff6b9d','#ff9966','#66ccff','#aa66ff','#ff4466'];
  const zoneIdx = FLOOR_ZONES.findIndex(z=>z===floorZone);
  const bearColor = bearColors[Math.max(0,zoneIdx)];

  return (
    <div style={{ background:'#0a0b14', borderRadius:12, overflow:'hidden',
      border:'2px solid rgba(255,255,255,0.08)' }}>

      {/* Auction panel */}
      {phase === 'auction' && (
        <div style={{ background:'rgba(0,0,0,0.85)', borderBottom:'2px solid #ffd700',
          padding:'10px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ color:'#ffd700', fontWeight:900, fontSize:14 }}>🏆 AUCTION — Highest gifter picks the chest!</span>
          <div style={{ display:'flex', gap:8, flex:1, flexWrap:'wrap' }}>
            {Object.entries(auctionBids).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([user,coins])=>(
              <span key={user} style={{ background:'rgba(255,215,0,0.15)', borderRadius:6, padding:'3px 8px',
                fontSize:12, color:'#ffd700', fontWeight:700 }}>@{user}: {coins.toLocaleString()} 💎</span>
            ))}
          </div>
          <button onClick={endAuction} style={{ background:'#ffd700', color:'#000', fontWeight:900,
            border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:13 }}>
            End Auction ✓
          </button>
        </div>
      )}

      {/* Chest pick panel */}
      {showChestPick && auctionWinner && (
        <div style={{ background:'rgba(0,0,0,0.9)', borderBottom:'2px solid #ffd700',
          padding:'12px 16px', textAlign:'center' }}>
          <div style={{ color:'#ffd700', fontWeight:900, fontSize:15, marginBottom:10 }}>
            🏆 @{auctionWinner.user} won with {auctionWinner.coins.toLocaleString()} 💎 — Pick a chest!
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            {engine.chestTypes?.map?.(c=>(
              <button key={c.id} onClick={()=>pickChest(c.id)}
                style={{ background:`${c.color}22`, border:`2px solid ${c.color}`,
                  borderRadius:12, padding:'10px 16px', cursor:'pointer', color:'white',
                  fontWeight:900, fontSize:14, textAlign:'center', minWidth:110 }}>
                <div style={{ fontSize:24 }}>{c.emoji}</div>
                <div>{c.label}</div>
                <div style={{ fontSize:11, opacity:0.7, fontWeight:400 }}>{c.desc}</div>
              </button>
            )) ?? require('@/hooks/useCannonEngine').CHEST_TYPES.map(c=>(
              <button key={c.id} onClick={()=>pickChest(c.id)}
                style={{ background:`${c.color}22`, border:`2px solid ${c.color}`,
                  borderRadius:12, padding:'10px 16px', cursor:'pointer', color:'white',
                  fontWeight:900, fontSize:14, textAlign:'center', minWidth:110 }}>
                <div style={{ fontSize:24 }}>{c.emoji}</div>
                <div>{c.label}</div>
                <div style={{ fontSize:11, opacity:0.7, fontWeight:400 }}>{c.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active boost banner */}
      {activeBoost && (
        <div style={{ background:`linear-gradient(90deg,${activeBoost.color}cc,${activeBoost.color})`,
          padding:'6px 16px', textAlign:'center', fontWeight:900, color:'#000', fontSize:15 }}>
          {activeBoost.emoji} {activeBoost.label}
        </div>
      )}

      {/* SVG Canvas */}
      <svg width="100%" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="xMidYMid meet"
        style={{ display:'block', maxHeight:460 }}>
        <Sky camWx={camWx}/>
        <Platform camWx={camWx}/>
        <Obstacles obstacles={obstacles} camWx={camWx}/>
        <Cannon chargeLevel={chargeLevel}/>
        {(phase === 'charging' || phase === 'auction') && chargeLevel > 0 && (
          <ChargeBar chargeLevel={chargeLevel}/>
        )}
        {showBall && ballCx > -30 && ballCx < CW+30 && (
          <GummyBear cx={ballCx} cy={ballCy} r={BALL_R} rot={ballRot} color={bearColor} username={ballUser}/>
        )}
        {/* Distance readout in flight */}
        {(phase==='in_flight'||phase==='rolling') && (
          <text x={CW-16} y={28} textAnchor="end" fontSize={22} fontWeight="900" fill="#00ddff"
            fontFamily="Arial Black,Impact,sans-serif" style={{ textShadow:'0 2px 8px rgba(0,0,0,0.9)' }}>
            {currentDist}m
          </text>
        )}
        {/* Landing score */}
        {phase==='landed' && (
          <g transform={`translate(${CW/2},${CH/2-40})`}>
            <rect x={-140} y={-40} width={280} height={80} rx={14} fill="rgba(0,0,0,0.82)"
              stroke="#ffd700" strokeWidth={3}/>
            <text textAnchor="middle" y={-14} fontSize={14} fill="#ffd700" fontWeight="900">🏁 LANDED!</text>
            <text textAnchor="middle" y={14} fontSize={28} fill="white" fontWeight="900"
              fontFamily="monospace">{currentDist}m</text>
            <text textAnchor="middle" y={32} fontSize={13} fill="#aaa">{floorZone?.label} zone</text>
          </g>
        )}
      </svg>

      {/* Bottom controls */}
      <div style={{ display:'flex', gap:10, padding:'10px 14px', background:'rgba(0,0,0,0.5)',
        borderTop:'1px solid rgba(255,255,255,0.06)', flexWrap:'wrap', alignItems:'center' }}>
        {(phase==='idle'||phase==='landed') && (
          <button onClick={startNewRound}
            style={{ background:'#22cc66', color:'#000', fontWeight:900, border:'none',
              borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:14 }}>
            🚀 New Round
          </button>
        )}
        {phase==='charging' && chargeLevel >= 25 && (
          <button onClick={manualLaunch}
            style={{ background:'#ff6d00', color:'white', fontWeight:900, border:'none',
              borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:14 }}>
            💥 LAUNCH!
          </button>
        )}
        <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12, marginLeft:'auto' }}>
          Best: <span style={{ color:'#ffd700', fontWeight:900 }}>{bestScore > 0 ? `${bestScore}pts` : '—'}</span>
        </span>
      </div>
    </div>
  );
}
