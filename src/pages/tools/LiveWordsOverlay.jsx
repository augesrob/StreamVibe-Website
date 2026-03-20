/**
 * LiveWordsOverlay — Game-show style portrait overlay
 * Route: /games-overlay/live-words?token=USER_OVERLAY_TOKEN
 *
 * TikTok Live recommended size: 1080×1920px (9:16 portrait)
 * Add as Browser Source in OBS/TikTok Live Studio at 1080×1920
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const THEMES = {
  purple: { bg:'linear-gradient(180deg,#1e0055 0%,#4a0d96 35%,#6b18b8 65%,#8b2fd4 100%)', dot:'rgba(255,255,255,0.07)' },
  dark:   { bg:'linear-gradient(180deg,#0a0a0f 0%,#141422 50%,#1a1a2e 100%)',              dot:'rgba(255,255,255,0.04)' },
  neon:   { bg:'linear-gradient(180deg,#001208 0%,#002810 50%,#003818 100%)',               dot:'rgba(0,255,100,0.06)'  },
  fire:   { bg:'linear-gradient(180deg,#3d0000 0%,#7a1500 40%,#b03000 100%)',               dot:'rgba(255,100,0,0.07)'  },
  ocean:  { bg:'linear-gradient(180deg,#001830 0%,#003860 40%,#0055a0 100%)',               dot:'rgba(0,180,255,0.07)'  },
  gold:   { bg:'linear-gradient(180deg,#2a1a00 0%,#5a3800 40%,#8a5a00 100%)',               dot:'rgba(255,200,0,0.07)'  },
};

function LetterTile({ letter, size=80 }) {
  return (
    <div style={{ width:size, height:size, background:'linear-gradient(160deg,#ffffff 0%,#e8e0ff 100%)', borderRadius:size*0.14, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 18px rgba(255,255,255,0.7),0 4px 12px rgba(0,0,0,0.5),inset 0 -4px 0 rgba(0,0,0,0.2)', border:'2px solid rgba(255,255,255,0.6)', flexShrink:0 }}>
      <span style={{ fontSize:size*0.52, fontWeight:900, fontFamily:'"Arial Black",Impact,sans-serif', color:'#2d0070', lineHeight:1 }}>{letter.toUpperCase()}</span>
    </div>
  );
}

function WordRow({ word, user, score, isNew }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, background:isNew?'rgba(255,230,0,0.18)':'rgba(255,255,255,0.07)', borderRadius:12, padding:'10px 16px', border:isNew?'1px solid rgba(255,220,0,0.5)':'1px solid rgba(255,255,255,0.1)', flexShrink:0 }}>
      <span style={{ fontFamily:'"Arial Black",sans-serif', fontWeight:900, fontSize:22, color:'#fff', textTransform:'uppercase', letterSpacing:'0.1em', minWidth:110 }}>{word}</span>
      <span style={{ fontSize:14, color:'rgba(255,255,255,0.5)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{user}</span>
      <span style={{ fontSize:20, fontWeight:900, color:'#ffd700', fontFamily:'monospace' }}>+{score}</span>
    </div>
  );
}

function CommandHint({ chatMode, chatCommand }) {
  if (chatMode === 'any') return (
    <div style={{ background:'rgba(150,0,255,0.25)', borderRadius:12, border:'1px solid rgba(180,100,255,0.35)', padding:'7px 20px', margin:'4px 0 10px', fontSize:15, color:'rgba(255,255,255,0.85)', fontFamily:'sans-serif', fontWeight:400, textAlign:'center', flexShrink:0 }}>
      💬 Type <span style={{ color:'#cc88ff', fontWeight:900 }}>any word</span> in chat to score!
    </div>
  );
  return (
    <div style={{ background:'rgba(0,0,0,0.35)', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', padding:'7px 20px', margin:'4px 0 10px', fontSize:15, color:'rgba(255,255,255,0.7)', fontFamily:'sans-serif', fontWeight:400, textAlign:'center', flexShrink:0 }}>
      Type <span style={{ color:'#ffd700', fontWeight:900, fontFamily:'monospace' }}>{chatCommand||'!word'}</span> + your answer in chat
    </div>
  );
}

function WordReveal({ possibleWords, foundWords }) {
  const foundSet = new Set((foundWords||[]).map(w => w.word?.toLowerCase()));
  const sorted   = [...(possibleWords||[])].sort((a,b) => b.length - a.length || a.localeCompare(b));
  if (!sorted.length) return null;
  return (
    <div style={{ width:'92%', flexShrink:0, background:'rgba(0,0,0,0.5)', borderRadius:20, border:'2px solid rgba(255,215,0,0.3)', padding:'14px', overflowY:'auto', maxHeight:340 }}>
      <div style={{ fontSize:12, color:'#ffd700', letterSpacing:'0.12em', marginBottom:10, textAlign:'center', fontWeight:900 }}>
        📖 ALL POSSIBLE WORDS ({sorted.length})
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
        {sorted.map(w => {
          const found = foundSet.has(w.toLowerCase());
          return (
            <div key={w} style={{ padding:'5px 12px', borderRadius:8, fontSize:14, fontWeight:900, fontFamily:'"Arial Black",sans-serif', textTransform:'uppercase', letterSpacing:'0.06em', background:found?'rgba(0,230,100,0.25)':'rgba(255,255,255,0.08)', border:found?'2px solid rgba(0,230,100,0.6)':'2px solid rgba(255,255,255,0.15)', color:found?'#00ff88':'rgba(255,255,255,0.6)' }}>
              {w}{found?' ✓':''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Leaderboard({ leaderboard }) {
  // Always render the leaderboard container — show placeholder rows if empty
  const medals = ['🥇','🥈','🥉'];
  const colors = ['#ffd700','#c0c0c0','#cd7f32'];
  const rows   = leaderboard.slice(0, 3);
  return (
    <div style={{ width:'90%', flexShrink:0, background:'rgba(0,0,0,0.45)', borderRadius:20, border:'1px solid rgba(255,215,0,0.25)', padding:'12px 14px' }}>
      <div style={{ fontSize:11, color:'rgba(255,215,0,0.7)', letterSpacing:'0.12em', marginBottom:8, textAlign:'center' }}>🏆 LEADERBOARD</div>
      {rows.length === 0 ? (
        // Placeholder rows so the leaderboard is visible even before anyone scores
        Array.from({length:3}).map((_,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:i<2?6:0, borderRadius:10, padding:'5px 8px', opacity:0.3 }}>
            <span style={{ fontSize:20, width:26 }}>{medals[i]}</span>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:`2px solid ${colors[i]}44` }}/>
            <span style={{ flex:1, height:14, background:'rgba(255,255,255,0.1)', borderRadius:4 }}/>
            <span style={{ width:30, height:14, background:'rgba(255,255,255,0.1)', borderRadius:4 }}/>
          </div>
        ))
      ) : (
        rows.map((l,i) => (
          <div key={l.user} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:i<rows.length-1?6:0, background:i===0?'rgba(255,215,0,0.1)':'transparent', borderRadius:10, padding:'5px 8px' }}>
            <span style={{ fontSize:20, width:26 }}>{medals[i]}</span>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, color:colors[i], border:`2px solid ${colors[i]}44`, flexShrink:0 }}>
              {l.user?.[0]?.toUpperCase()??'?'}
            </div>
            <span style={{ flex:1, fontSize:15, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>@{l.user}</span>
            <span style={{ fontSize:17, fontWeight:900, color:colors[i], fontFamily:'monospace', flexShrink:0, textShadow:`0 0 8px ${colors[i]}` }}>{l.score}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function LiveWordsOverlay() {
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
    const ch = supabase.channel(`livewords:${userId}`)
      .on('broadcast', { event:'state' }, ({ payload }) => setState(payload))
      .subscribe();
    const poll = setInterval(() => {
      try { const raw = localStorage.getItem('sv_livewords_overlay'); if (raw) setState(JSON.parse(raw)); } catch(_) {}
    }, 800);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [authState, userId]);

  if (authState === 'loading') return null;
  if (authState === 'invalid') return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#1a0040', color:'#f87171', fontFamily:'monospace', fontSize:16, textAlign:'center', padding:32 }}>
      ❌ Invalid overlay URL.
    </div>
  );

  const theme        = THEMES[state?.themeId ?? 'purple'] ?? THEMES.purple;
  const chatMode     = state?.chatMode    ?? 'command';
  const chatCommand  = state?.chatCommand ?? '!word';
  const isFinished   = state?.phase === 'finished';

  if (!state || state.phase === 'idle') return (
    <div style={{ position:'fixed', inset:0, background:theme.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24, fontFamily:'"Arial Black",sans-serif' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:`radial-gradient(circle,${theme.dot} 1px,transparent 1px)`, backgroundSize:'36px 36px', pointerEvents:'none' }}/>
      <div style={{ fontSize:60 }}>🔤</div>
      <div style={{ textAlign:'center' }}>
        <p style={{ color:'#ffd700', fontSize:32, fontWeight:900, margin:0, textShadow:'0 0 20px rgba(255,215,0,0.5)' }}>LIVE WORDS</p>
        <p style={{ color:'rgba(255,255,255,0.6)', fontSize:18, margin:'8px 0 0', fontFamily:'sans-serif', fontWeight:400 }}>Waiting for host to start…</p>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        {'READY'.split('').map((l,i) => <LetterTile key={i} letter={l} size={70}/>)}
      </div>
    </div>
  );

  const letters      = state.letters     ?? [];
  const foundWords   = state.foundWords  ?? [];
  const leaderboard  = state.leaderboard ?? [];
  const possibleWords= state.possibleWords ?? [];
  const remaining    = state.remaining   ?? 0;
  const mins = String(Math.floor(remaining/60)).padStart(2,'0');
  const secs = String(remaining%60).padStart(2,'0');
  const found = foundWords.length;
  const timerColor = remaining<=10?'#ff4444':remaining<=20?'#ffaa00':'#00ff88';
  const TILE_SIZE = letters.length>7?80:92;
  const GAP = letters.length>7?8:10;

  return (
    // Outer: full screen column, no overflow:hidden so content can scroll if needed
    <div style={{ position:'fixed', inset:0, background:theme.bg, display:'flex', flexDirection:'column', alignItems:'center', fontFamily:'"Arial Black",Impact,sans-serif', overflowY:'auto' }}>
      <div style={{ position:'fixed', inset:0, backgroundImage:`radial-gradient(circle,${theme.dot} 1px,transparent 1px)`, backgroundSize:'36px 36px', pointerEvents:'none', zIndex:0 }}/>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 28px 10px', position:'relative', zIndex:1, flexShrink:0 }}>
        <div style={{ background:'rgba(0,0,0,0.4)', borderRadius:14, border:`2px solid ${timerColor}44`, padding:'8px 18px', textAlign:'center', boxShadow:`0 0 20px ${timerColor}33` }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:'0.12em', marginBottom:2 }}>TIME</div>
          <div style={{ fontSize:34, fontWeight:900, color:timerColor, lineHeight:1, fontFamily:'monospace', textShadow:`0 0 16px ${timerColor}` }}>
            {isFinished?'🏁':`${mins}:${secs}`}
          </div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em' }}>ROUND</div>
          <div style={{ fontSize:40, fontWeight:900, color:'#ffd700', lineHeight:1, textShadow:'0 0 20px rgba(255,215,0,0.6)' }}>#{state.roundNum??1}</div>
        </div>
        <div style={{ background:'rgba(0,0,0,0.4)', borderRadius:14, border:'2px solid rgba(255,215,0,0.3)', padding:'8px 18px', textAlign:'center' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:'0.12em', marginBottom:2 }}>FOUND</div>
          <div style={{ fontSize:34, fontWeight:900, color:'#ffd700', lineHeight:1, fontFamily:'monospace' }}>{found}</div>
        </div>
      </div>

      {/* ── Banner ───────────────────────────────────────────────────────── */}
      <div style={{ background:isFinished?'linear-gradient(90deg,#cc0000,#ff3300)':'linear-gradient(90deg,#ff6b00,#ffaa00)', borderRadius:14, padding:'12px 28px', margin:'6px 0', boxShadow:`0 4px 24px ${isFinished?'rgba(200,0,0,0.5)':'rgba(255,140,0,0.5)'}`, position:'relative', zIndex:1, textAlign:'center', flexShrink:0 }}>
        <span style={{ fontSize:18, fontWeight:900, color:'#fff', letterSpacing:'0.06em' }}>
          {isFinished?'⏱ ROUND OVER!':'🔤 FIND THE WORDS!'}
        </span>
      </div>

      {/* ── Letter tiles ─────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:GAP, margin:'14px 16px 6px', padding:'14px 18px', background:'rgba(0,0,0,0.3)', borderRadius:22, border:'2px solid rgba(255,255,255,0.15)', position:'relative', zIndex:1, flexWrap:'wrap', maxWidth:'92%', flexShrink:0 }}>
        {letters.map((l,i) => <LetterTile key={i} letter={l} size={TILE_SIZE}/>)}
      </div>

      {/* ── Command hint (hide when finished) ────────────────────────────── */}
      {!isFinished && (
        <div style={{ width:'90%', position:'relative', zIndex:1, flexShrink:0 }}>
          <CommandHint chatMode={chatMode} chatCommand={chatCommand}/>
        </div>
      )}

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div style={{ width:'86%', height:10, background:'rgba(0,0,0,0.4)', borderRadius:5, overflow:'hidden', margin:'2px 0 14px', border:'1px solid rgba(255,255,255,0.1)', position:'relative', zIndex:1, flexShrink:0 }}>
        <div style={{ height:'100%', width:`${Math.min(100,(remaining/(state.totalDuration??60))*100)}%`, background:`linear-gradient(90deg,${timerColor},${timerColor}88)`, borderRadius:5, transition:'width 1s linear' }}/>
      </div>

      {/* ── Middle section: word reveal (finished) OR found words feed ───── */}
      <div style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:8, position:'relative', zIndex:1, flexShrink:0 }}>
        {isFinished ? (
          <WordReveal possibleWords={possibleWords} foundWords={foundWords}/>
        ) : (
          <div style={{ width:'90%', display:'flex', flexDirection:'column', gap:7 }}>
            {foundWords.length===0
              ? Array.from({length:4}).map((_,i) => (
                  <div key={i} style={{ height:50, background:'rgba(0,0,0,0.25)', borderRadius:12, border:'2px dashed rgba(255,255,255,0.1)', display:'flex', alignItems:'center', paddingLeft:16 }}>
                    <span style={{ color:'rgba(255,255,255,0.15)', fontSize:13, fontFamily:'sans-serif' }}>waiting for first word…</span>
                  </div>
                ))
              : foundWords.slice(0,4).map((fw,i) => (
                  <WordRow key={fw.ts??i} word={fw.word} user={fw.user} score={fw.score} isNew={i===0}/>
                ))
            }
          </div>
        )}
      </div>

      {/* ── Leaderboard — ALWAYS VISIBLE ─────────────────────────────────── */}
      <div style={{ width:'100%', display:'flex', justifyContent:'center', position:'relative', zIndex:1, margin:'12px 0 28px', flexShrink:0 }}>
        <Leaderboard leaderboard={leaderboard}/>
      </div>

    </div>
  );
}
