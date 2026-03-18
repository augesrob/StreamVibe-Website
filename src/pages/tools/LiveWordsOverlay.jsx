/**
 * LiveWordsOverlay — per-user browser source for TikTok Live Studio
 * Route: /games-overlay/live-words?token=USER_OVERLAY_TOKEN
 * No header, no footer — pure transparent overlay canvas
 */
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

function LetterCircle({ letters }) {
  if (!letters?.length) return null;
  const count = letters.length;
  const R = 90, CX = 130, CY = 130;
  const angles = Array.from({ length: count }, (_, i) => (i * 360) / count - 90);
  return (
    <svg width={260} height={260} viewBox="0 0 260 260" style={{ filter:'drop-shadow(0 0 12px rgba(0,229,255,0.4))' }}>
      {letters.map((l, i) => {
        const a  = (angles[i] * Math.PI) / 180;
        const cx = CX + R * Math.cos(a);
        const cy = CY + R * Math.sin(a);
        return (
          <g key={i} transform={`translate(${cx},${cy})`}>
            <circle r={24} fill="rgba(0,10,30,0.88)" stroke="#00e5ff" strokeWidth={2.5} />
            <text x={0} y={1} textAnchor="middle" dominantBaseline="middle"
              fontSize={18} fontWeight="900" fontFamily="monospace" fill="#00e5ff">
              {l.toUpperCase()}
            </text>
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r={7} fill="rgba(0,229,255,0.2)" stroke="rgba(0,229,255,0.4)" strokeWidth={1.5} />
    </svg>
  );
}

export default function LiveWordsOverlay() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [authState, setAuthState] = useState('loading'); // loading|valid|invalid
  const [userId, setUserId]       = useState(null);
  const [state, setState]         = useState(null);

  // Transparent bg — no chrome
  useEffect(() => {
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    return () => {
      document.body.style.background = '';
      document.documentElement.style.background = '';
    };
  }, []);

  // Validate token
  useEffect(() => {
    if (!token) { setAuthState('invalid'); return; }
    supabase.from('profiles').select('id').eq('overlay_token', token).single()
      .then(({ data, error }) => {
        if (error || !data) { setAuthState('invalid'); return; }
        setUserId(data.id);
        setAuthState('valid');
      });
  }, [token]);

  // Realtime + localStorage polling
  useEffect(() => {
    if (authState !== 'valid' || !userId) return;
    const channel = supabase.channel(`livewords:${userId}`)
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        setState(payload);
      })
      .subscribe();
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem('sv_livewords_overlay');
        if (raw) setState(JSON.parse(raw));
      } catch (_) {}
    }, 800);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [authState, userId]);

  if (authState === 'loading') return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', color:'white', fontFamily:'monospace', fontSize:14 }}>
      Validating overlay...
    </div>
  );
  if (authState === 'invalid') return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#000', color:'#f87171', fontFamily:'monospace', fontSize:14, textAlign:'center', padding:32 }}>
      ❌ Invalid overlay URL. Generate a new one from your dashboard.
    </div>
  );

  if (!state || state.phase === 'idle') return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent' }}>
      <div style={{ background:'rgba(0,0,0,0.7)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:16, padding:'24px 32px', textAlign:'center', fontFamily:'monospace' }}>
        <div style={{ fontSize:36 }}>🔤</div>
        <p style={{ color:'#00e5ff', fontWeight:900, fontSize:16, margin:'8px 0 4px' }}>StreamVibe Live Words</p>
        <p style={{ color:'#555', fontSize:11, margin:0 }}>Waiting for host to start round…</p>
      </div>
    </div>
  );

  const mins = String(Math.floor((state.remaining ?? 0) / 60)).padStart(2, '0');
  const secs = String((state.remaining ?? 0) % 60).padStart(2, '0');
  const isFinished = state.phase === 'finished';

  return (
    <div style={{ position:'fixed', inset:0, background:'transparent', overflow:'hidden', pointerEvents:'none', display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:24, gap:16 }}>

      {/* Left — letters + timer */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <div style={{ fontFamily:'monospace', fontWeight:900, fontSize:36, color: isFinished?'#ef4444':'#4ade80', textShadow:`0 0 20px ${isFinished?'#ef444488':'#4ade8088'}` }}>
          {isFinished ? 'ROUND OVER' : `${mins}:${secs}`}
        </div>
        <LetterCircle letters={state.letters ?? []} />
        <div style={{ background:'rgba(0,0,0,0.6)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:8, padding:'4px 12px', fontSize:11, color:'#00e5ff', fontWeight:700, fontFamily:'monospace' }}>
          Round #{state.roundNum ?? 1}
        </div>
      </div>

      {/* Right — words + leaderboard */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, minWidth:200, maxWidth:220 }}>
        <div style={{ background:'rgba(0,0,0,0.7)', border:'1px solid rgba(0,229,255,0.15)', borderRadius:12, padding:12 }}>
          <p style={{ fontSize:10, color:'#0e7490', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 8px' }}>Recent Words</p>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {(state.foundWords ?? []).slice(0, 6).map((fw, i) => (
              <div key={fw.ts ?? i} style={{ display:'flex', alignItems:'center', gap:8, opacity: i===0?1:i<4?0.8:0.5 }}>
                <span style={{ fontFamily:'monospace', fontWeight:900, color:'#67e8f9', textTransform:'uppercase', fontSize:13 }}>{fw.word}</span>
                <span style={{ color:'#555', fontSize:10 }}>@{fw.user}</span>
                <span style={{ marginLeft:'auto', color:'#fbbf24', fontWeight:900, fontSize:11 }}>+{fw.score}</span>
              </div>
            ))}
          </div>
        </div>
        {(state.leaderboard ?? []).length > 0 && (
          <div style={{ background:'rgba(0,0,0,0.7)', border:'1px solid rgba(251,191,36,0.15)', borderRadius:12, padding:12 }}>
            <p style={{ fontSize:10, color:'#92400e', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 8px' }}>Top Players</p>
            {['🥇','🥈','🥉'].map((medal, i) => {
              const l = state.leaderboard[i];
              if (!l) return null;
              return (
                <div key={l.user} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, fontSize:13 }}>
                  <span style={{ width:20, textAlign:'center' }}>{medal}</span>
                  <span style={{ color:'white', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:100 }}>@{l.user}</span>
                  <span style={{ marginLeft:'auto', color:'#fbbf24', fontFamily:'monospace', fontWeight:900 }}>{l.score}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
