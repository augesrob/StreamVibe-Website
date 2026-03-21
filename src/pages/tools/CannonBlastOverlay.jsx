/**
 * CannonBlastOverlay v9 — TikTok Live Studios Browser Source
 *
 * URL: /games-overlay/cannon-blast?token=YOUR_TOKEN
 *
 * TIKTOK LIVE STUDIOS SETUP:
 *   1. Add "Browser Source" widget
 *   2. Paste your overlay URL
 *   3. Width: 1080, Height: 1920 (portrait) OR Width: 1920, Height: 1080 (landscape)
 *   4. Enable "Transparent Background"
 *   5. Check "Shutdown source when not visible"
 *
 * Background is fully transparent — overlays cleanly over your camera feed.
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { FLOOR_ZONES, CHEST_TYPES } from '@/hooks/useCannonEngine';

// ── Canvas dimensions matching CannonGame ─────────────────────────────
const CW       = 1080;
const CH_GAME  = 360;    // game canvas strip height
const PX       = 10;
const GND_Y    = CH_GAME - 60;
const CANNON_X = 100;
const BALL_R   = 14;

function wx2cx(wx, camWx) { return CANNON_X + (wx - camWx) * PX; }
function wy2cy(wy)         { return GND_Y - wy * PX; }

// ── Gummy Bear (overlay version) ──────────────────────────────────────
function GummyBearSVG({ cx, cy, r, rot, color, username }) {
  const s = r / 11;
  return (
    <g transform={`translate(${cx},${cy}) rotate(${rot})`}>
      <ellipse cx={0} cy={2*s} rx={9*s} ry={10*s} fill={color} stroke="rgba(255,255,255,0.25)" strokeWidth={1.2}/>
      <circle cx={0} cy={-9*s} r={8*s} fill={color} stroke="rgba(255,255,255,0.25)" strokeWidth={1.2}/>
      <circle cx={-6*s} cy={-16*s} r={3.5*s} fill={color}/>
      <circle cx={ 6*s} cy={-16*s} r={3.5*s} fill={color}/>
      <circle cx={-3*s} cy={-10*s} r={2*s} fill="rgba(0,0,0,0.8)"/>
      <circle cx={ 3*s} cy={-10*s} r={2*s} fill="rgba(0,0,0,0.8)"/>
      <circle cx={-2*s} cy={-11*s} r={0.8*s} fill="white"/>
      <circle cx={ 4*s} cy={-11*s} r={0.8*s} fill="white"/>
      <ellipse cx={0} cy={-7*s} rx={1.5*s} ry={s} fill="rgba(0,0,0,0.5)"/>
      <path d={`M${-3*s} ${-5*s} Q 0 ${-2*s} ${3*s} ${-5*s}`}
        stroke="rgba(0,0,0,0.6)" strokeWidth={1.2*s} fill="none" strokeLinecap="round"/>
      <ellipse cx={-11*s} cy={-2*s} rx={3*s} ry={5*s} fill={color} transform={`rotate(-25,${-11*s},${-2*s})`}/>
      <ellipse cx={ 11*s} cy={-2*s} rx={3*s} ry={5*s} fill={color} transform={`rotate( 25,${11*s},${-2*s})`}/>
      <ellipse cx={-4*s} cy={12*s} rx={3.5*s} ry={5*s} fill={color}/>
      <ellipse cx={ 4*s} cy={12*s} rx={3.5*s} ry={5*s} fill={color}/>
      <ellipse cx={-3*s} cy={-1*s} rx={2.5*s} ry={4*s} fill="rgba(255,255,255,0.18)" transform="rotate(-20,-3,0)"/>
      {username && (
        <g transform={`rotate(${-rot}) translate(0,${-28*s})`}>
          <rect x={-50} y={-13} width={100} height={18} rx={6} fill="rgba(0,0,0,0.75)" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5}/>
          <text textAnchor="middle" y={2} fontSize={11} fill="white" fontWeight="900"
            fontFamily="'Arial Black',Impact,sans-serif">@{username.slice(0,14)}</text>
        </g>
      )}
    </g>
  );
}

// ── Game strip canvas ─────────────────────────────────────────────────
function GameStrip({ state }) {
  const phase      = state?.phase      ?? 'idle';
  const ballWx     = state?.ballWx     ?? 0;
  const ballWy     = state?.ballWy     ?? 0;
  const ballRot    = state?.ballRot    ?? 0;
  const ballUser   = state?.ballUser   ?? null;
  const camWx      = state?.camWx      ?? 0;
  const chargeLevel= state?.chargeLevel?? 0;
  const obstacles  = state?.obstacles  ?? [];
  const floorZone  = state?.floorZone  ?? FLOOR_ZONES[0];
  const zoneIdx    = FLOOR_ZONES.findIndex(z=>z?.label===floorZone?.label);
  const bearColors = ['#ff6b9d','#ff9966','#66ccff','#aa66ff','#ff4466'];
  const bearColor  = bearColors[Math.max(0,zoneIdx)];
  const showBall   = phase==='in_flight'||phase==='rolling'||phase==='landed';
  const ballCx     = wx2cx(ballWx, camWx);
  const ballCy     = wy2cy(ballWy);

  return (
    <svg width="100%" viewBox={`0 0 ${CW} ${CH_GAME}`} preserveAspectRatio="xMidYMid meet"
      style={{ display:'block' }}>
      {/* Sky - semi-transparent for overlay */}
      <defs>
        <linearGradient id="skyOvl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(80,160,220,0.7)"/>
          <stop offset="100%" stopColor="rgba(160,210,240,0.5)"/>
        </linearGradient>
      </defs>
      <rect width={CW} height={CH_GAME} fill="url(#skyOvl)" rx={16}/>

      {/* Platform planks */}
      {Array.from({length:80},(_,i)=>i*14).map(wx=>{
        const x1=wx2cx(wx,camWx); const x2=wx2cx(wx+14,camWx);
        if(x2<-5||x1>CW+5) return null;
        return <rect key={wx} x={x1} y={GND_Y} width={Math.max(0,x2-x1-1)} height={CH_GAME-GND_Y}
          fill={wx%28===0?'rgba(200,148,58,0.9)':'rgba(212,160,68,0.9)'} rx={1}/>;
      })}
      <line x1={0} y1={GND_Y} x2={CW} y2={GND_Y} stroke="rgba(255,255,255,0.5)" strokeWidth={2}/>

      {/* Distance rings */}
      {Array.from({length:15},(_,i)=>(i+1)*20).map(m=>{
        const cx=wx2cx(m,camWx);
        if(cx<-10||cx>CW+10) return null;
        const big = m%100===0;
        return (
          <g key={m}>
            <line x1={cx} y1={GND_Y-3} x2={cx} y2={GND_Y-20} stroke={big?'#ffe066':'rgba(255,255,255,0.55)'} strokeWidth={big?3:1.5}/>
            <text x={cx} y={GND_Y-25} textAnchor="middle" fontSize={big?14:10} fill={big?'#ffe066':'rgba(255,255,255,0.8)'}
              fontWeight={big?'900':'400'} fontFamily="'Arial Black',Impact,sans-serif">{m}m</text>
          </g>
        );
      })}

      {/* Obstacles */}
      {obstacles.filter(o=>o.active).map(o=>{
        const cx=wx2cx(o.wx,camWx); const cy=wy2cy(o.wy);
        if(cx<-20||cx>CW+20) return null;
        if(o.type==='bomb') return (
          <g key={o.id} transform={`translate(${cx},${cy})`}>
            <circle r={12} fill="#222" stroke="#666" strokeWidth={2}/>
            <line x1={0} y1={-12} x2={3} y2={-20} stroke="#aaa" strokeWidth={2}/>
            <circle cx={4} cy={-22} r={4} fill="#ff8800" opacity={0.9}/>
          </g>
        );
        if(o.type==='bouncer') return (
          <g key={o.id} transform={`translate(${cx},${cy})`}>
            <ellipse cx={0} cy={0} rx={14} ry={9} fill="#ffd700" stroke="#cc9900" strokeWidth={2}/>
          </g>
        );
        return null;
      })}

      {/* Cannon */}
      <g transform={`translate(${CANNON_X},${GND_Y})`}>
        <circle cx={-16} cy={8} r={18} fill="#1a1008" stroke="#5a3010" strokeWidth={3}/>
        <circle cx={ 16} cy={8} r={18} fill="#1a1008" stroke="#5a3010" strokeWidth={3}/>
        <rect x={-28} y={-13} width={62} height={24} rx={8} fill="#120c04" stroke="#3a2008" strokeWidth={2}/>
        <g transform={`rotate(${-38 - (chargeLevel/100)*4},10,-5)`}>
          <rect x={4} y={-12} width={75} height={24} rx={12} fill="#0e0e0e" stroke="#555" strokeWidth={2.5}/>
        </g>
      </g>

      {/* Charge bar */}
      {phase==='charging' && chargeLevel > 0 && (() => {
        const pct = chargeLevel/100;
        const col = pct<0.35?'#00e5ff':pct<0.65?'#ffd600':pct<0.88?'#ff6d00':'#ff1744';
        return (
          <g transform={`translate(${CW/2-180},14)`}>
            <rect x={0} y={0} width={360} height={36} rx={12} fill="rgba(0,0,0,0.8)" stroke="rgba(255,255,255,0.2)" strokeWidth={2}/>
            <rect x={4} y={4} width={352*pct} height={28} rx={10} fill={col}/>
            <text x={180} y={24} textAnchor="middle" fontSize={13} fontWeight="900" fill="white"
              fontFamily="'Arial Black',Impact,sans-serif">
              {pct<0.25?'🎁 GIFT TO CHARGE!':pct<0.99?`⚡ ${Math.round(pct*100)}% CHARGED`:'🔥 FULL POWER!'}
            </text>
          </g>
        );
      })()}

      {/* Ball */}
      {showBall && ballCx>-40 && ballCx<CW+40 && (
        <GummyBearSVG cx={ballCx} cy={ballCy} r={BALL_R} rot={ballRot} color={bearColor} username={ballUser}/>
      )}
    </svg>
  );
}

// ── Main overlay export ───────────────────────────────────────────────
export default function CannonBlastOverlay() {
  const [searchParams]  = useSearchParams();
  const token           = searchParams.get('token');
  const [authState,  setAuthState]  = useState('loading');
  const [userId,     setUserId]     = useState(null);
  const [state,      setState]      = useState(null);

  // Force transparent background + remove scrollbars for obs/tls
  useEffect(() => {
    document.body.style.background      = 'transparent';
    document.body.style.margin          = '0';
    document.body.style.overflow        = 'hidden';
    document.documentElement.style.background = 'transparent';
    document.documentElement.classList.add('overlay-mode');
    return () => {
      document.documentElement.classList.remove('overlay-mode');
      document.body.style.background = '';
    };
  }, []);

  useEffect(() => {
    if (!token) { setAuthState('invalid'); return; }
    supabase.from('profiles').select('id').eq('overlay_token', token).single()
      .then(({ data, error }) => {
        if (error || !data) { setAuthState('invalid'); return; }
        setUserId(data.id); setAuthState('valid');
      });
  }, [token]);

  useEffect(() => {
    if (authState !== 'valid' || !userId) return;
    const ch = supabase.channel(`cannon:${userId}`)
      .on('broadcast', { event:'state' }, ({ payload }) => setState(payload))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [authState, userId]);

  if (authState === 'loading') return null;
  if (authState === 'invalid') return (
    <div style={{ padding:32, color:'#f87171', fontFamily:'monospace', background:'rgba(0,0,0,0.7)',
      borderRadius:12, display:'inline-block', position:'fixed', top:20, left:20 }}>
      ❌ Invalid overlay token
    </div>
  );

  const phase       = state?.phase       ?? 'idle';
  const currentDist = state?.currentDist ?? 0;
  const finalScore  = state?.finalScore  ?? 0;
  const bestScore   = state?.bestScore   ?? 0;
  const activeBoost = state?.activeBoost ?? null;
  const leaderboard = state?.leaderboard ?? [];
  const roundCount  = state?.roundCount  ?? 0;
  const floorZone   = state?.floorZone   ?? { label:'1×', mult:1 };
  const auctionBids = state?.auctionBids ?? {};
  const auctionWinner = state?.auctionWinner ?? null;
  const showChestPick = state?.showChestPick ?? false;
  const recentGifts = state?.recentGifts ?? [];

  const phaseLabel = {
    idle:'🎯 READY', auction:'🏆 AUCTION', chest_pick:'🎁 PICK CHEST',
    charging:'⚡ CHARGING', in_flight:'🚀 LAUNCHED!', rolling:'🏃 ROLLING!', landed:'🏁 LANDED',
  }[phase] ?? phase;

  return (
    // Outer wrapper: transparent bg, full viewport, pointer-events:none so clicks pass through
    <div style={{ position:'fixed', inset:0, background:'transparent',
      pointerEvents:'none', fontFamily:"'Arial Black',Impact,sans-serif",
      display:'flex', flexDirection:'column', alignItems:'center', overflow:'hidden' }}>

      {/* ── Header row ── */}
      <div style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'14px 18px 6px', pointerEvents:'none' }}>
        {/* Round badge */}
        <div style={{ background:'rgba(0,0,0,0.62)', borderRadius:12,
          border:'2px solid rgba(0,200,100,0.4)', padding:'6px 14px', textAlign:'center' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', letterSpacing:'0.1em' }}>ROUND</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#00cc66', lineHeight:1 }}>#{roundCount}</div>
        </div>
        {/* Title + phase */}
        <div style={{ textAlign:'center' }}>
          <div style={{ color:'#00ee66', fontSize:22, fontWeight:900, textShadow:'0 0 24px rgba(0,238,102,0.6)' }}>
            💥 CANNON BLAST
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', fontWeight:400,
            fontFamily:'sans-serif' }}>{phaseLabel}</div>
        </div>
        {/* Best score */}
        <div style={{ background:'rgba(0,0,0,0.62)', borderRadius:12,
          border:'2px solid rgba(255,215,0,0.35)', padding:'6px 14px', textAlign:'center' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', letterSpacing:'0.1em' }}>BEST</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#ffd700', lineHeight:1, fontFamily:'monospace' }}>
            {bestScore > 0 ? bestScore : '—'}
          </div>
        </div>
      </div>

      {/* ── Game canvas strip ── */}
      <div style={{ width:'98%', borderRadius:16, overflow:'hidden',
        border:'2px solid rgba(255,255,255,0.12)', margin:'4px 0' }}>
        <GameStrip state={state}/>
      </div>

      {/* ── Boost banner ── */}
      {activeBoost && (
        <div style={{ background:`linear-gradient(90deg,${activeBoost.color}cc,${activeBoost.color})`,
          borderRadius:10, padding:'8px 28px', margin:'4px 0',
          boxShadow:`0 4px 24px ${activeBoost.color}66`, textAlign:'center' }}>
          <span style={{ fontSize:17, fontWeight:900, color:'#000' }}>
            {activeBoost.emoji} {activeBoost.label}{activeBoost.user?` from @${activeBoost.user}!`:'!'}
          </span>
        </div>
      )}

      {/* ── Distance / score row ── */}
      <div style={{ display:'flex', gap:28, alignItems:'center', margin:'6px 0' }}>
        {(phase==='in_flight'||phase==='rolling'||phase==='landed') && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', fontWeight:400, fontFamily:'sans-serif' }}>DISTANCE</div>
            <div style={{ fontSize:42, fontWeight:900, color:'#00ddff', fontFamily:'monospace', lineHeight:1,
              textShadow:'0 0 16px rgba(0,221,255,0.6)' }}>{currentDist}m</div>
          </div>
        )}
        {finalScore > 0 && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', fontWeight:400, fontFamily:'sans-serif' }}>SCORE</div>
            <div style={{ fontSize:42, fontWeight:900, color:'#ffd700', fontFamily:'monospace', lineHeight:1,
              textShadow:'0 0 16px rgba(255,215,0,0.6)' }}>{finalScore}</div>
          </div>
        )}
        {(phase==='in_flight'||phase==='rolling') && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', fontWeight:400, fontFamily:'sans-serif' }}>ZONE</div>
            <div style={{ fontSize:32, fontWeight:900, color:'#88ff88', lineHeight:1 }}>{floorZone?.label??'1×'}</div>
          </div>
        )}
      </div>

      {/* ── Auction panel ── */}
      {phase === 'auction' && Object.keys(auctionBids).length > 0 && (
        <div style={{ background:'rgba(0,0,0,0.72)', borderRadius:14,
          border:'2px solid rgba(255,215,0,0.4)', padding:'10px 14px', width:'90%', margin:'4px 0' }}>
          <div style={{ color:'#ffd700', fontWeight:900, fontSize:13, textAlign:'center', marginBottom:8 }}>
            🏆 AUCTION — Highest gifter picks chest!
          </div>
          {Object.entries(auctionBids).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([user,coins],i)=>(
            <div key={user} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:i<4?4:0,
              background:i===0?'rgba(255,215,0,0.1)':'transparent', borderRadius:6, padding:'3px 8px' }}>
              <span style={{ fontSize:18 }}>{['🥇','🥈','🥉','4.','5.'][i]}</span>
              <span style={{ flex:1, fontSize:14, fontWeight:700, color:'white' }}>@{user}</span>
              <span style={{ color:'#ffd700', fontWeight:900, fontFamily:'monospace' }}>{coins.toLocaleString()} 💎</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Chest pick ── */}
      {showChestPick && auctionWinner && (
        <div style={{ background:'rgba(0,0,0,0.75)', borderRadius:14,
          border:'2px solid #ffd700', padding:'12px 18px', width:'90%', margin:'4px 0', textAlign:'center' }}>
          <div style={{ color:'#ffd700', fontWeight:900, fontSize:14, marginBottom:10 }}>
            🏆 @{auctionWinner.user} is picking a chest...
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            {CHEST_TYPES.map(c=>(
              <div key={c.id} style={{ background:`${c.color}22`, border:`2px solid ${c.color}44`,
                borderRadius:10, padding:'8px 14px', fontSize:13, color:'white', fontWeight:700 }}>
                {c.emoji} {c.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent gifts feed ── */}
      {recentGifts.length > 0 && (
        <div style={{ width:'88%', margin:'4px 0' }}>
          {recentGifts.slice(0,4).map((g,i)=>(
            <div key={g.ts} style={{ display:'flex', alignItems:'center', gap:8,
              background:'rgba(0,0,0,0.5)', borderRadius:8, padding:'4px 10px', marginBottom:4,
              opacity: 1 - i*0.18 }}>
              <span style={{ fontSize:16 }}>{g.tier.emoji}</span>
              <span style={{ color:'white', fontWeight:700, fontSize:13 }}>@{g.user}</span>
              <span style={{ color:g.tier.color, fontWeight:900, fontSize:13, marginLeft:'auto' }}>
                {g.tier.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Leaderboard ── */}
      {leaderboard.length > 0 && (
        <div style={{ width:'90%', background:'rgba(0,0,0,0.6)', borderRadius:14,
          border:'1px solid rgba(255,215,0,0.2)', padding:'10px 12px', margin:'4px 0 0' }}>
          <div style={{ fontSize:11, color:'rgba(255,215,0,0.7)', letterSpacing:'0.12em',
            marginBottom:6, textAlign:'center' }}>🏆 LEADERBOARD</div>
          {leaderboard.slice(0,5).map((l,i)=>(
            <div key={l.ts??i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:i<4?4:0,
              background:i===0?'rgba(255,215,0,0.08)':'transparent', borderRadius:6, padding:'3px 6px' }}>
              <span style={{ fontSize:16, width:22 }}>{['🥇','🥈','🥉','4.','5.'][i]}</span>
              <span style={{ flex:1, fontSize:13, fontWeight:700, color:'#fff', overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{l.user}</span>
              <span style={{ fontSize:13, fontWeight:900, color:['#ffd700','#c0c0c0','#cd7f32','#aaa','#aaa'][i],
                fontFamily:'monospace' }}>{l.score}pts</span>
              <span style={{ fontSize:11, color:'#888', fontFamily:'monospace' }}>{l.dist}m</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tip ── */}
      {(phase==='idle'||phase==='auction'||phase==='charging') && (
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', margin:'8px 0 16px',
          fontFamily:'sans-serif', fontWeight:400 }}>
          🎁 Gift to charge the cannon!
        </div>
      )}
    </div>
  );
}
