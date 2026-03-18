/**
 * CannonBlastOverlay — browser source overlay, portrait
 * Route: /games-overlay/cannon-blast?token=
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const SCALE = 5;
const CANVAS_W = 600;
const CANVAS_H = 280;
const CANNON_X = 50;
const GROUND_Y = CANVAS_H - 40;

function MiniCannon({ angle }) {
  return (
    <g transform={`translate(${CANNON_X},${GROUND_Y})`}>
      <circle cx={-8} cy={6} r={14} fill="#333" stroke="#555" strokeWidth={2} />
      <circle cx={16} cy={6} r={14} fill="#333" stroke="#555" strokeWidth={2} />
      <rect x={-18} y={-6} width={44} height={14} rx={3} fill="#222" stroke="#444" strokeWidth={1.5} />
      <g transform={`rotate(${-angle},8,0)`}>
        <rect x={6} y={-8} width={44} height={16} rx={8} fill="#1a1a1a" stroke="#444" strokeWidth={1.5} />
      </g>
    </g>
  );
}

function MiniBall({ x, y, phase }) {
  if (phase === 'idle') return null;
  return (
    <g transform={`translate(${CANNON_X + x * SCALE},${GROUND_Y - y * SCALE})`}>
      <circle r={11} fill="#e0e0e0" stroke="#999" strokeWidth={1.5} />
      <circle cx={-3} cy={-3} r={3} fill="rgba(0,0,0,0.7)" />
      <circle cx={3}  cy={-3} r={3} fill="rgba(0,0,0,0.7)" />
      <path d="M -3 2 Q 0 5 3 2" stroke="rgba(0,0,0,0.7)" strokeWidth={1.5} fill="none" />
    </g>
  );
}

export default function CannonBlastOverlay() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [authState, setAuthState] = useState('loading');
  const [userId, setUserId] = useState(null);
  const [state, setState] = useState(null);

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
      .on('broadcast', { event: 'state' }, ({ payload }) => setState(payload))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [authState, userId]);

  if (authState === 'loading') return null;
  if (authState === 'invalid') return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#000', color:'#f87171', fontFamily:'monospace', fontSize:14, textAlign:'center', padding:32 }}>
      ❌ Invalid overlay URL
    </div>
  );

  const phase      = state?.phase ?? 'idle';
  const ballPos    = state?.ballPos ?? { x:0, y:0 };
  const distance   = state?.distance ?? 0;
  const topDist    = state?.topDistance ?? 0;
  const angle      = state?.angle ?? 45;
  const leaderboard= state?.leaderboard ?? [];
  const activeBoost= state?.activeBoost;
  const lastShooter= state?.lastShooter;
  const roundCount = state?.roundCount ?? 0;

  return (
    <div style={{ position:'fixed', inset:0, background:'linear-gradient(180deg,#1a0a00 0%,#3d1500 40%,#5a2000 100%)', display:'flex', flexDirection:'column', alignItems:'center', fontFamily:'"Arial Black",Impact,sans-serif', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(255,100,0,0.06) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px 8px', position:'relative', zIndex:1 }}>
        <div style={{ background:'rgba(0,0,0,0.5)', borderRadius:12, border:'2px solid rgba(255,120,0,0.4)', padding:'8px 16px', textAlign:'center' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em' }}>ROUND</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#ff6b00', lineHeight:1 }}>#{roundCount}</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ color:'#ff6b00', fontSize:22, fontWeight:900, textShadow:'0 0 20px rgba(255,107,0,0.6)' }}>💥 CANNON BLAST</div>
        </div>
        <div style={{ background:'rgba(0,0,0,0.5)', borderRadius:12, border:'2px solid rgba(255,215,0,0.3)', padding:'8px 16px', textAlign:'center' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em' }}>RECORD</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#ffd700', lineHeight:1, fontFamily:'monospace' }}>{topDist ? `${topDist}m` : '—'}</div>
        </div>
      </div>

      {/* Game canvas */}
      <div style={{ width:'92%', background:'linear-gradient(180deg,#87ceeb,#b0e0ff)', borderRadius:16, overflow:'hidden', border:'2px solid rgba(255,255,255,0.15)', position:'relative', zIndex:1, margin:'8px 0' }}>
        <svg width="100%" viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="xMidYMid meet">
          <rect width={CANVAS_W} height={CANVAS_H} fill="#87CEEB" />
          {[[100,50],[250,35],[420,60],[560,45]].map(([cx,cy],i) => (
            <g key={i} transform={`translate(${cx},${cy})`} opacity={0.7}>
              <ellipse cx={0} cy={0} rx={25} ry={15} fill="white" />
              <ellipse cx={15} cy={-4} rx={18} ry={11} fill="white" />
              <ellipse cx={-14} cy={-3} rx={16} ry={10} fill="white" />
            </g>
          ))}
          <rect x={0} y={GROUND_Y+2} width={CANVAS_W} height={40} fill="#4a3728" />
          <rect x={0} y={GROUND_Y} width={CANVAS_W} height={4} fill="#6b5040" />
          {Array.from({length:12},(_,i)=>(i+1)*10).map(d=>{
            const px=CANNON_X+d*SCALE; if(px>CANVAS_W) return null;
            return <g key={d}><line x1={px} y1={GROUND_Y} x2={px} y2={GROUND_Y+10} stroke="#8b6a55" strokeWidth={1}/><text x={px} y={GROUND_Y+20} textAnchor="middle" fontSize={8} fill="#a08060">{d}m</text></g>;
          })}
          <MiniCannon angle={angle} />
          <MiniBall x={ballPos.x} y={ballPos.y} phase={phase} />
          {phase==='landed' && distance>0 && (
            <g>
              <line x1={CANNON_X+ballPos.x*SCALE} y1={GROUND_Y-24} x2={CANNON_X+ballPos.x*SCALE} y2={GROUND_Y+2} stroke="#ffd600" strokeWidth={2} strokeDasharray="4,3" />
              <rect x={CANNON_X+ballPos.x*SCALE-36} y={GROUND_Y-40} width={72} height={20} rx={5} fill="rgba(0,0,0,0.7)" stroke="#ffd600" strokeWidth={1.5}/>
              <text x={CANNON_X+ballPos.x*SCALE} y={GROUND_Y-24} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#ffd600">{distance}m {lastShooter?`@${lastShooter}`:''}</text>
            </g>
          )}
        </svg>
      </div>

      {/* Active boost banner */}
      {activeBoost && (
        <div style={{ background:`linear-gradient(90deg,${activeBoost.color}cc,${activeBoost.color})`, borderRadius:12, padding:'10px 28px', margin:'4px 0', boxShadow:`0 4px 20px ${activeBoost.color}66`, position:'relative', zIndex:1, textAlign:'center' }}>
          <span style={{ fontSize:18, fontWeight:900, color:'#000', letterSpacing:'0.06em' }}>
            {activeBoost.emoji} {activeBoost.label}{activeBoost.user ? ` from @${activeBoost.user}!` : '!'}
          </span>
        </div>
      )}

      {/* Distance */}
      <div style={{ fontSize: phase==='launched'?32:42, fontWeight:900, color: phase==='landed'?'#ffd700':'#ff6b00', lineHeight:1, margin:'8px 0', fontFamily:'monospace', textShadow:`0 0 20px ${phase==='landed'?'rgba(255,215,0,0.6)':'rgba(255,107,0,0.5)'}`, position:'relative', zIndex:1 }}>
        {phase==='idle'?'🎯 READY TO BLAST!': phase==='launched'?`${Math.round(ballPos.x)}m...`:`💥 ${distance}m!`}
      </div>

      {/* Leaderboard */}
      {leaderboard.length>0 && (
        <div style={{ width:'90%', background:'rgba(0,0,0,0.5)', borderRadius:16, border:'1px solid rgba(255,215,0,0.2)', padding:'12px 14px', position:'relative', zIndex:1 }}>
          <div style={{ fontSize:11, color:'rgba(255,215,0,0.7)', letterSpacing:'0.12em', marginBottom:8, textAlign:'center' }}>🏆 LEADERBOARD</div>
          {leaderboard.slice(0,5).map((l,i)=>{
            const medals=['🥇','🥈','🥉','4.','5.'], colors=['#ffd700','#c0c0c0','#cd7f32','#aaa','#aaa'];
            return (
              <div key={l.ts??i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:i<4?6:0, background:i===0?'rgba(255,215,0,0.1)':'transparent', borderRadius:8, padding:'4px 6px' }}>
                <span style={{ fontSize:18, width:24 }}>{medals[i]}</span>
                <span style={{ flex:1, fontSize:14, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{l.user}</span>
                <span style={{ fontSize:16, fontWeight:900, color:colors[i], fontFamily:'monospace' }}>{l.distance}m</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', margin:'8px 0 16px', position:'relative', zIndex:1, fontFamily:'sans-serif', fontWeight:400 }}>
        🎁 Gift to boost the cannon!
      </div>
    </div>
  );
}
