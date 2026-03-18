/**
 * LiveWordsOverlay — Game-show style portrait overlay
 * Route: /games-overlay/live-words?token=USER_OVERLAY_TOKEN
 * No header/footer — pure transparent canvas for TikTok Live Studio
 * Portrait: 1080 × 1920
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

/* ─── Tile component ─────────────────────────────────────────────────────── */
function LetterTile({ letter, size = 80, glow = false }) {
  return (
    <div style={{
      width: size, height: size,
      background: 'linear-gradient(160deg, #ffffff 0%, #e8e0ff 100%)',
      borderRadius: size * 0.14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: glow
        ? '0 0 24px rgba(255,255,255,0.9), 0 4px 16px rgba(0,0,0,0.5), inset 0 -4px 0 rgba(0,0,0,0.2)'
        : '0 4px 16px rgba(0,0,0,0.5), inset 0 -4px 0 rgba(0,0,0,0.2)',
      border: '2px solid rgba(255,255,255,0.6)',
      flexShrink: 0,
      position: 'relative',
    }}>
      <span style={{
        fontSize: size * 0.52,
        fontWeight: 900,
        fontFamily: '"Arial Black", "Impact", sans-serif',
        color: '#2d0070',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        textShadow: '0 1px 2px rgba(255,255,255,0.4)',
      }}>
        {letter.toUpperCase()}
      </span>
    </div>
  );
}

/* ─── Empty slot ─────────────────────────────────────────────────────────── */
function EmptySlot({ size = 80 }) {
  return (
    <div style={{
      width: size, height: size,
      background: 'rgba(0,0,0,0.35)',
      borderRadius: size * 0.14,
      border: '2px solid rgba(255,255,255,0.15)',
      flexShrink: 0,
    }} />
  );
}

/* ─── Found word row ─────────────────────────────────────────────────────── */
function WordRow({ word, user, score, isNew }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: isNew ? 'rgba(255,230,0,0.18)' : 'rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '10px 16px',
      border: isNew ? '1px solid rgba(255,220,0,0.5)' : '1px solid rgba(255,255,255,0.1)',
      transition: 'all 0.3s',
    }}>
      <span style={{
        fontFamily: '"Arial Black", sans-serif', fontWeight: 900,
        fontSize: 22, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em',
        textShadow: '0 0 10px rgba(255,255,255,0.4)',
        minWidth: 120,
      }}>{word}</span>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', flex: 1 }}>@{user}</span>
      <span style={{
        fontSize: 20, fontWeight: 900, color: '#ffd700',
        fontFamily: 'monospace', textShadow: '0 0 8px rgba(255,215,0,0.6)',
      }}>+{score}</span>
    </div>
  );
}

/* ─── Main overlay ───────────────────────────────────────────────────────── */
export default function LiveWordsOverlay() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [authState, setAuthState] = useState('loading');
  const [userId, setUserId]       = useState(null);
  const [state, setState]         = useState(null);

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
      .on('broadcast', { event: 'state' }, ({ payload }) => setState(payload))
      .subscribe();
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem('sv_livewords_overlay');
        if (raw) setState(JSON.parse(raw));
      } catch (_) {}
    }, 800);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [authState, userId]);

  /* ── Auth / idle screens ─────────────────────────────────────────────── */
  if (authState === 'loading') return null;

  if (authState === 'invalid') return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
      background:'#1a0040', color:'#f87171', fontFamily:'monospace', fontSize:16, textAlign:'center', padding:32 }}>
      ❌ Invalid overlay URL.<br/>Generate a new one from Overlay Setup.
    </div>
  );

  /* ── Idle / waiting screen ───────────────────────────────────────────── */
  if (!state || state.phase === 'idle') return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(180deg, #2d0070 0%, #5b0fa8 40%, #7c1fc8 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 24, fontFamily: '"Arial Black", sans-serif',
    }}>
      {/* Decorative dots grid */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize:'36px 36px', pointerEvents:'none' }} />
      <div style={{ fontSize:60 }}>🔤</div>
      <div style={{ textAlign:'center' }}>
        <p style={{ color:'#ffd700', fontSize:32, fontWeight:900, margin:0, textShadow:'0 0 20px rgba(255,215,0,0.5)' }}>LIVE WORDS</p>
        <p style={{ color:'rgba(255,255,255,0.6)', fontSize:18, margin:'8px 0 0', fontFamily:'sans-serif', fontWeight:400 }}>Waiting for host to start…</p>
      </div>
      {/* Animated letter tiles placeholder */}
      <div style={{ display:'flex', gap:10 }}>
        {'READY'.split('').map((l,i) => <LetterTile key={i} letter={l} size={70} />)}
      </div>
    </div>
  );

  /* ── Active game ─────────────────────────────────────────────────────── */
  const letters     = state.letters ?? [];
  const foundWords  = state.foundWords ?? [];
  const leaderboard = state.leaderboard ?? [];
  const isFinished  = state.phase === 'finished';
  const remaining   = state.remaining ?? 0;
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  const totalPossible = 39; // shown in score
  const found = foundWords.length;

  // Timer color
  const timerColor = remaining <= 10 ? '#ff4444' : remaining <= 20 ? '#ffaa00' : '#00ff88';

  const TILE_SIZE = letters.length > 7 ? 84 : 96;
  const GAP = letters.length > 7 ? 8 : 10;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(180deg, #1e0055 0%, #4a0d96 35%, #6b18b8 65%, #8b2fd4 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      fontFamily: '"Arial Black", "Impact", sans-serif',
      overflow: 'hidden',
    }}>
      {/* Dot pattern bg */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize:'36px 36px', pointerEvents:'none' }} />

      {/* ── Top bar: timer + score ── */}
      <div style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 32px 12px', position: 'relative', zIndex: 1,
      }}>
        {/* Timer */}
        <div style={{
          background: 'rgba(0,0,0,0.4)', borderRadius: 16,
          border: `2px solid ${timerColor}44`,
          padding: '10px 20px', textAlign: 'center',
          boxShadow: `0 0 20px ${timerColor}33`,
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing:'0.12em', marginBottom:2 }}>TIME</div>
          <div style={{ fontSize: 36, fontWeight:900, color: timerColor, lineHeight:1, fontFamily:'monospace',
            textShadow: `0 0 16px ${timerColor}` }}>
            {isFinished ? '🏁' : `${mins}:${secs}`}
          </div>
        </div>

        {/* Round badge centre */}
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em' }}>ROUND</div>
          <div style={{ fontSize:42, fontWeight:900, color:'#ffd700', lineHeight:1,
            textShadow:'0 0 20px rgba(255,215,0,0.6)' }}>#{state.roundNum ?? 1}</div>
        </div>

        {/* Score */}
        <div style={{
          background: 'rgba(0,0,0,0.4)', borderRadius: 16,
          border: '2px solid rgba(255,215,0,0.3)',
          padding: '10px 20px', textAlign:'center',
          boxShadow: '0 0 20px rgba(255,215,0,0.15)',
        }}>
          <div style={{ fontSize: 11, color:'rgba(255,255,255,0.5)', letterSpacing:'0.12em', marginBottom:2 }}>FOUND</div>
          <div style={{ fontSize: 36, fontWeight:900, color:'#ffd700', lineHeight:1, fontFamily:'monospace',
            textShadow:'0 0 16px rgba(255,215,0,0.6)' }}>
            {found}
          </div>
        </div>
      </div>

      {/* ── Callout banner ── */}
      <div style={{
        background: 'linear-gradient(90deg, #ff6b00, #ffaa00)',
        borderRadius: 16, padding: '14px 32px', margin: '8px 0',
        boxShadow: '0 4px 24px rgba(255,140,0,0.5)',
        position: 'relative', zIndex: 1,
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 20, fontWeight:900, color:'#1a0000', letterSpacing:'0.06em' }}>
          {isFinished ? '⏱ ROUND OVER!' : '🔤 FIND THE WORDS!'}
        </span>
      </div>

      {/* ── Letter tiles row ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: GAP, margin: '24px 16px 8px',
        padding: '20px 24px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 24,
        border: '2px solid rgba(255,255,255,0.15)',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4), 0 0 40px rgba(255,255,255,0.05)',
        position: 'relative', zIndex: 1,
        flexWrap: 'wrap',
        maxWidth: '90%',
      }}>
        {letters.map((l, i) => (
          <LetterTile key={i} letter={l} size={TILE_SIZE} glow={true} />
        ))}
      </div>

      {/* ── Command hint ── */}
      <div style={{
        background: 'rgba(0,0,0,0.35)', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 24px', margin: '4px 0 16px',
        fontSize: 16, color: 'rgba(255,255,255,0.7)',
        fontFamily: 'sans-serif', fontWeight: 400,
        position: 'relative', zIndex: 1,
        textAlign: 'center',
      }}>
        Type <span style={{ color:'#ffd700', fontWeight:900, fontFamily:'monospace' }}>!word</span> + your answer in chat
      </div>

      {/* ── Progress bar ── */}
      <div style={{
        width: '86%', height: 12, background: 'rgba(0,0,0,0.4)',
        borderRadius: 6, overflow: 'hidden', margin: '4px 0 20px',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, (remaining / (state.totalDuration ?? 60)) * 100)}%`,
          background: `linear-gradient(90deg, ${timerColor}, ${timerColor}88)`,
          borderRadius: 6,
          transition: 'width 1s linear',
          boxShadow: `0 0 8px ${timerColor}`,
        }} />
      </div>

      {/* ── Recent found words ── */}
      <div style={{
        width: '90%', flex: 1, overflowY: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 8,
        position: 'relative', zIndex: 1,
        maxHeight: 300,
      }}>
        {foundWords.length === 0 ? (
          /* Empty slots like the reference image */
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              height: 52, background: 'rgba(0,0,0,0.25)', borderRadius: 12,
              border: '2px dashed rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', paddingLeft: 16,
            }}>
              <span style={{ color:'rgba(255,255,255,0.15)', fontSize:13, fontFamily:'sans-serif' }}>waiting for first word…</span>
            </div>
          ))
        ) : (
          foundWords.slice(0, 5).map((fw, i) => (
            <WordRow key={fw.ts ?? i} word={fw.word} user={fw.user} score={fw.score} isNew={i === 0} />
          ))
        )}
      </div>

      {/* ── Leaderboard ── */}
      {leaderboard.length > 0 && (
        <div style={{
          width: '90%', margin: '12px 0 24px',
          background: 'rgba(0,0,0,0.4)', borderRadius: 20,
          border: '1px solid rgba(255,215,0,0.2)',
          padding: '14px 16px',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ fontSize:12, color:'rgba(255,215,0,0.7)', letterSpacing:'0.12em', marginBottom:10, textAlign:'center' }}>
            🏆 LEADERBOARD
          </div>
          {leaderboard.slice(0, 3).map((l, i) => {
            const medals = ['🥇','🥈','🥉'];
            const colors = ['#ffd700','#c0c0c0','#cd7f32'];
            return (
              <div key={l.user} style={{
                display:'flex', alignItems:'center', gap:10,
                marginBottom: i < 2 ? 8 : 0,
                background: i === 0 ? 'rgba(255,215,0,0.1)' : 'transparent',
                borderRadius: 10, padding: '6px 8px',
              }}>
                <span style={{ fontSize:22, width:28 }}>{medals[i]}</span>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.15)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:16, fontWeight:900, color: colors[i],
                  border: `2px solid ${colors[i]}44` }}>
                  {l.user?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span style={{ flex:1, fontSize:16, fontWeight:700, color:'#fff',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  @{l.user}
                </span>
                <span style={{ fontSize:18, fontWeight:900, color: colors[i], fontFamily:'monospace',
                  textShadow:`0 0 8px ${colors[i]}` }}>{l.score}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
