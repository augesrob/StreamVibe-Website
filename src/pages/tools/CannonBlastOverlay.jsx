/**
 * CannonBlastOverlay v7 — Browser source overlay for Cannon Blast
 * Route: /games-overlay/cannon-blast?token=
 * Reads from Supabase Realtime channel cannon:{userId}
 * State fields match v7 engine broadcast: ballWx, ballWy, camWx, chargeLevel, etc.
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

// Canvas constants (match CannonGame.jsx)
const CW       = 800;
const CH       = 260;
const PX       = 14;          // px per WU (slightly smaller for overlay)
const GND_Y    = CH - 50;
const CANNON_X = 80;
const BALL_R   = 11;

function wx2cx(wx, camWx) { return CANNON_X + (wx - camWx) * PX; }
function wy2cy(wy)         { return GND_Y - wy * PX; }

// Floor zone colour strips
const FLOOR_ZONES = [
  { minWx:0,   label:'1×', color:'#1a3a1a' },
  { minWx:50,  label:'2×', color:'#1a3a2a' },
  { minWx:100, label:'3×', color:'#1a3a3a' },
  { minWx:160, label:'4×', color:'#1a2a3a' },
  { minWx:220, label:'5×', color:'#2a1a3a' },
];

function OverlayCanvas({ state }) {
  const phase      = state?.phase      ?? 'idle';
  const ballWx     = state?.ballWx     ?? 0;
  const ballWy     = state?.ballWy     ?? 0;
  const ballRot    = state?.ballRot    ?? 0;
  const camWx      = state?.camWx      ?? 0;
  const chargeLevel= state?.chargeLevel ?? 0;
  const floorZone  = state?.floorZone  ?? FLOOR_ZONES[0];

  const showBall = phase !== 'idle' && phase !== 'chest_pick' && !(phase === 'charging');

  return (
    <svg width="100%" viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="xMidYMid meet"
      style={{ background:'linear-gradient(180deg,#0d1a0d 0%,#0a2a0a 100%)' }}>

      {/* Floor zone strips */}
      {FLOOR_ZONES.map((z, i) => {
        const x1 = wx2cx(z.minWx, camWx);
        const x2 = i+1 < FLOOR_ZONES.length ? wx2cx(FLOOR_ZONES[i+1].minWx, camWx) : CW+60;
        if (x2 < -10 || x1 > CW+10) return null;
        return (
          <g key={i}>
            <rect x={x1} y={GND_Y} width={x2-x1} height={CH-GND_Y} fill={z.color}/>
            <rect x={x1} y={GND_Y} width={x2-x1} height={3}
              fill={['#22cc44','#44cc88','#44cccc','#4488cc','#9944cc'][i]} opacity={0.8}/>
          </g>
        );
      })}
      <line x1={0} y1={GND_Y} x2={CW} y2={GND_Y} stroke="#2a5a2a" strokeWidth={3}/>

      {/* Distance markers */}
      {Array.from({length:20},(_,i)=>(i+1)*20).map(m => {
        const cx = wx2cx(m, camWx);
        if (cx < 0 || cx > CW) return null;
        return (
          <g key={m}>
            <line x1={cx} y1={GND_Y-5} x2={cx} y2={GND_Y+2} stroke="#2a4a2a" strokeWidth={1.5}/>
            <text x={cx} y={GND_Y-8} textAnchor="middle" fontSize={9} fill="#3a6a3a">{m}m</text>
          </g>
        );
      })}

      {/* Cannon */}
      <g transform={`translate(${CANNON_X-10},${GND_Y})`}>
        <circle cx={-10} cy={4} r={14} fill="#1a1008" stroke="#4a2a10" strokeWidth={2}/>
        <circle cx={18}  cy={4} r={14} fill="#1a1008" stroke="#4a2a10" strokeWidth={2}/>
        <rect x={-22} y={-10} width={56} height={20} rx={6} fill="#120c04" stroke="#3a2008" strokeWidth={2}/>
        <g transform={`rotate(${-10 - (chargeLevel/100)*5},10,-3)`}>
          <rect x={6} y={-9} width={60} height={18} rx={9} fill="#0e0e0e" stroke="#555" strokeWidth={2}/>
          {(phase==='in_flight'||phase==='rolling') && (
            <ellipse cx={76} cy={0} rx={16} ry={10} fill="#ff5500" opacity={0.85}/>
          )}
        </g>
      </g>

      {/* Charge bar (only in charging phase) */}
      {phase === 'charging' && (() => {
        const pct = chargeLevel / 100;
        const col = pct < 0.4 ? '#00e5ff' : pct < 0.7 ? '#ffd600' : pct < 0.9 ? '#ff6d00' : '#ff1744';
        return (
          <g transform={`translate(${CW/2-100},12)`}>
            <rect x={0} y={0} width={200} height={24} rx={8} fill="rgba(0,0,0,0.8)" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5}/>
            <rect x={3} y={3} width={194*pct} height={18} rx={6} fill={col}/>
            <text x={100} y={17} textAnchor="middle" fontSize={10} fontWeight="900" fill="white">
              {pct < 0.3 ? '⚡ CHARGING...' : `⚡ ${Math.round(pct*100)}%`}
            </text>
          </g>
        );
      })()}

      {/* Ball */}
      {showBall && (() => {
        const cx = wx2cx(ballWx, camWx);
        const cy = wy2cy(ballWy);
        if (cx < -20 || cx > CW+20) return null;
        return (
          <g transform={`translate(${cx},${cy}) rotate(${ballRot})`}>
            <circle r={BALL_R} fill="#e0e0e0" stroke="#999" strokeWidth={2}
              style={{ filter:'drop-shadow(0 3px 8px rgba(0,0,0,0.7))' }}/>
            <g transform={`rotate(${-ballRot})`}>
              <circle cx={-4} cy={-3} r={3.5} fill="rgba(0,0,0,0.75)"/>
              <circle cx={4}  cy={-3} r={3.5} fill="rgba(0,0,0,0.75)"/>
              <path d="M -4 3 Q 0 7 4 3" stroke="rgba(0,0,0,0.75)" strokeWidth={2.5} fill="none" strokeLinecap="round"/>
            </g>
          </g>
        );
      })()}
    </svg>
  );
}

export default function CannonBlastOverlay() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [authState, setAuthState] = useState('loading');
  const [userId,    setUserId]    = useState(null);
  const [state,     setState]     = useState(null);

  useEffect(() => {
    document.documentElement.classList.add('overlay-mode');
    return () => document.documentElement.classList.remove('overlay-mode');
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
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
      background:'#000', color:'#f87171', fontFamily:'monospace', fontSize:14, textAlign:'center', padding:32 }}>
      ❌ Invalid overlay URL
    </div>
  );

  const phase       = state?.phase       ?? 'idle';
  const currentDist = state?.currentDist ?? 0;
  const finalScore  = state?.finalScore  ?? 0;
  const bestScore   = state?.bestScore   ?? 0;
  const activeBoost = state?.activeBoost ?? null;
  const leaderboard = state?.leaderboard ?? [];
  const roundCount  = state?.roundCount  ?? 0;
  const multipliers = state?.multipliers ?? { power:1, bomb:0, bouncer:0 };
  const floorZone   = state?.floorZone   ?? { label:'1×', mult:1 };

  const phaseLabel = {
    idle:'🎯 READY', chest_pick:'🎁 PICK CHESTS',
    charging:'⚡ CHARGING', in_flight:'🚀 LAUNCHED!',
    rolling:'🏃 ROLLING!', landed:'🏁 LANDED',
  }[phase] ?? phase.toUpperCase();

  return (
    <div style={{ position:'fixed', inset:0, background:'linear-gradient(180deg,#0a1a0a 0%,#0d2a0d 50%,#0a1a0a 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', fontFamily:'"Arial Black",Impact,sans-serif',
      overflow:'hidden', color:'white' }}>

      {/* Grid bg */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(0,200,100,0.04) 1px,transparent 1px)',
        backgroundSize:'40px 40px', pointerEvents:'none' }}/>

      {/* Header row */}
      <div style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'16px 20px 8px', position:'relative', zIndex:1 }}>
        <div style={{ background:'rgba(0,0,0,0.55)', borderRadius:10, border:'2px solid rgba(0,200,100,0.3)',
          padding:'6px 14px', textAlign:'center' }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.45)', letterSpacing:'0.1em' }}>ROUND</div>
          <div style={{ fontSize:26, fontWeight:900, color:'#00cc66', lineHeight:1 }}>#{roundCount}</div>
        </div>

        <div style={{ textAlign:'center' }}>
          <div style={{ color:'#00ee66', fontSize:20, fontWeight:900, textShadow:'0 0 20px rgba(0,238,102,0.5)' }}>
            💥 CANNON BLAST
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', fontWeight:400, fontFamily:'sans-serif' }}>
            {phaseLabel}
          </div>
        </div>

        <div style={{ background:'rgba(0,0,0,0.55)', borderRadius:10, border:'2px solid rgba(255,215,0,0.3)',
          padding:'6px 14px', textAlign:'center' }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.45)', letterSpacing:'0.1em' }}>BEST</div>
          <div style={{ fontSize:26, fontWeight:900, color:'#ffd700', lineHeight:1, fontFamily:'monospace' }}>
            {bestScore > 0 ? bestScore : '—'}
          </div>
        </div>
      </div>

      {/* Game canvas */}
      <div style={{ width:'94%', borderRadius:14, overflow:'hidden', border:'2px solid rgba(0,200,100,0.2)',
        position:'relative', zIndex:1, margin:'4px 0' }}>
        <OverlayCanvas state={state}/>
      </div>

      {/* Boost banner */}
      {activeBoost && (
        <div style={{ background:`linear-gradient(90deg,${activeBoost.color}cc,${activeBoost.color})`,
          borderRadius:10, padding:'8px 24px', margin:'4px 0', boxShadow:`0 4px 20px ${activeBoost.color}66`,
          position:'relative', zIndex:1, textAlign:'center' }}>
          <span style={{ fontSize:16, fontWeight:900, color:'#000' }}>
            {activeBoost.emoji} {activeBoost.label}{activeBoost.user ? ` from @${activeBoost.user}!` : '!'}
          </span>
        </div>
      )}

      {/* Score / distance */}
      <div style={{ display:'flex', gap:24, alignItems:'center', margin:'6px 0', position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', fontFamily:'sans-serif', fontWeight:400 }}>DISTANCE</div>
          <div style={{ fontSize:36, fontWeight:900, color:'#00ddff', fontFamily:'monospace', lineHeight:1 }}>
            {currentDist > 0 ? `${currentDist}m` : '—'}
          </div>
        </div>
        {finalScore > 0 && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', fontFamily:'sans-serif', fontWeight:400 }}>SCORE</div>
            <div style={{ fontSize:36, fontWeight:900, color:'#ffd700', fontFamily:'monospace', lineHeight:1,
              textShadow:'0 0 20px rgba(255,215,0,0.6)' }}>{finalScore}</div>
          </div>
        )}
        {phase !== 'idle' && phase !== 'chest_pick' && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', letterSpacing:'0.1em', fontFamily:'sans-serif', fontWeight:400 }}>ZONE</div>
            <div style={{ fontSize:28, fontWeight:900, color:'#88ff88', lineHeight:1 }}>{floorZone?.label ?? '1×'}</div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div style={{ width:'90%', background:'rgba(0,0,0,0.5)', borderRadius:14,
          border:'1px solid rgba(255,215,0,0.2)', padding:'10px 12px', position:'relative', zIndex:1 }}>
          <div style={{ fontSize:10, color:'rgba(255,215,0,0.7)', letterSpacing:'0.12em', marginBottom:6, textAlign:'center' }}>
            🏆 LEADERBOARD
          </div>
          {leaderboard.slice(0,5).map((l,i)=>{
            const medals=['🥇','🥈','🥉','4.','5.'];
            const colors=['#ffd700','#c0c0c0','#cd7f32','#aaa','#aaa'];
            return (
              <div key={l.ts??i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:i<4?4:0,
                background:i===0?'rgba(255,215,0,0.08)':'transparent', borderRadius:6, padding:'3px 5px' }}>
                <span style={{ fontSize:16, width:22 }}>{medals[i]}</span>
                <span style={{ flex:1, fontSize:13, fontWeight:700, color:'#fff', overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{l.user}</span>
                <span style={{ fontSize:13, fontWeight:900, color:colors[i], fontFamily:'monospace' }}>
                  {l.score} pts
                </span>
                <span style={{ fontSize:11, color:'#888', fontFamily:'monospace' }}>{l.dist}m</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', margin:'8px 0 14px',
        position:'relative', zIndex:1, fontFamily:'sans-serif', fontWeight:400 }}>
        🎁 Gift to charge the cannon!
      </div>
    </div>
  );
}
