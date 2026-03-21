/**
 * CannonBlastOverlay — TikTok Live Studios Browser Source
 * URL: /games-overlay/cannon-blast?token=YOUR_TOKEN
 *
 * TIKTOK LIVE STUDIOS SETUP:
 *   1. Add Browser Source widget
 *   2. Paste your overlay URL
 *   3. Width: 1920, Height: 1080
 *   4. Enable Transparent Background
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { CHEST_PICKS } from '@/hooks/useCannonEngine';

const MARKER_STEP = 85;
const PX_PER_WU   = MARKER_STEP / 10;
const CANNON_X    = 68;
const BALL_R      = 13;

export default function CannonBlastOverlay() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [authState, setAuthState] = useState('loading');
  const [userId,    setUserId]    = useState(null);
  const [state,     setState]     = useState(null);

  // Force transparent bg for OBS / TikTok Live Studios
  useEffect(() => {
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
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
      .on('broadcast', { event: 'state' }, ({ payload }) => setState(payload))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [authState, userId]);

  if (authState === 'loading') return null;
  if (authState === 'invalid') return (
    <div style={{ padding: 32, color: '#f87171', fontFamily: 'monospace',
      background: 'rgba(0,0,0,0.7)', borderRadius: 12,
      position: 'fixed', top: 20, left: 20 }}>
      ❌ Invalid overlay token
    </div>
  );

  const phase       = state?.phase       ?? 'idle';
  const score       = state?.score       ?? 0;
  const bestScore   = state?.bestScore   ?? 0;
  const rewardLabel = state?.rewardLabel ?? 'Poor';
  const ballX       = state?.ballX       ?? 0;
  const ballY       = state?.ballY       ?? 0;
  const ballRot     = state?.ballRot     ?? 0;
  const ballUser    = state?.ballUser    ?? null;
  const camX        = state?.camX        ?? 0;
  const chargeLevel = state?.chargeLevel ?? 0;
  const multipliers = state?.multipliers ?? { launch: 1, bombs: 1, power: 1 };
  const activeBoost = state?.activeBoost ?? null;
  const leaderboard = state?.leaderboard ?? [];
  const roundCount  = state?.roundCount  ?? 0;
  const auctionBids = state?.auctionBids ?? {};
  const auctionWinner = state?.auctionWinner ?? null;
  const showChestPick = state?.showChestPick ?? false;
  const recentGifts = state?.recentGifts ?? [];
  const markers     = state?.markers     ?? [];
  const currentMark = state?.currentMark ?? 0;

  const showBall = phase === 'flying' || phase === 'rolling' || phase === 'landed';
  const worldShift = camX * PX_PER_WU;
  const PLAT_FRAC = 0.54;

  const phaseLabel = {
    idle: '🎯 READY', auction: '🏆 AUCTION', chest_pick: '🎁 PICK CHEST',
    tap_to_shoot: '💥 TAP TO SHOOT', flying: '🚀 LAUNCHED!',
    rolling: '🏃 ROLLING!', landed: '🏁 LANDED',
  }[phase] ?? phase;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'transparent',
      pointerEvents: 'none', fontFamily: "'Arial Black', Impact, Arial",
      overflow: 'hidden', color: 'white',
    }}>

      {/* ── GAME STRIP — matches the main game visual ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '58vh',
        overflow: 'hidden',
      }}>
        {/* Sky */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg,#72c0e8 0%,#9ed4f0 60%,#bde4f8 100%)',
        }}/>

        {/* Scrolling world: markers */}
        <div style={{
          position: 'absolute', left: CANNON_X, top: 0, bottom: 0, width: 8000,
          transform: `translateX(${-worldShift}px)`,
        }}>
          {markers.filter(m => {
            const sx = m.worldX - worldShift + CANNON_X;
            return sx > -60 && sx < 2000;
          }).map(mk => {
            const isCurrent = mk.num === currentMark;
            const platY = window.innerHeight * 0.54 * 0.54;
            return (
              <div key={mk.num} style={{
                position: 'absolute', left: mk.worldX - 22, top: '47%',
                width: 44, height: 44, borderRadius: '50%',
                background: isCurrent
                  ? 'radial-gradient(circle at 35% 35%,#ff99dd,#cc3388 50%,#882255)'
                  : 'radial-gradient(circle at 35% 35%,#88ee66,#44aa22 50%,#227700)',
                border: `2.5px solid ${isCurrent ? '#ff44aa' : '#33aa00'}`,
                boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: mk.num > 99 ? 10 : mk.num > 9 ? 12 : 14,
                fontWeight: 900, color: 'white',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              }}>{mk.num}</div>
            );
          })}
        </div>

        {/* Platform rail */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '54%', height: 22,
          background: 'linear-gradient(180deg,#cc8030 0%,#a06018 40%,#7a4208 100%)',
          zIndex: 4,
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: 'rgba(255,200,100,0.3)' }}/>
        </div>

        {/* Sandy ground */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(54% + 22px)', bottom: 0,
          background: 'linear-gradient(180deg,#d4a858 0%,#a87030 100%)',
        }}/>

        {/* Cannon (fixed) */}
        <div style={{
          position: 'absolute', left: 10, top: 'calc(54% - 28px)', zIndex: 5,
          fontSize: 40,
        }}>🔫</div>

        {/* Ball */}
        {showBall && (() => {
          const bwPx  = ballX * PX_PER_WU;
          const bscX  = CANNON_X + (bwPx - worldShift);
          const bscY  = (window.innerHeight * 0.58 * PLAT_FRAC) - ballY * PX_PER_WU - BALL_R;
          if (bscX < -30 || bscX > 2000) return null;
          return (
            <div style={{
              position: 'absolute', left: bscX - BALL_R, top: bscY - BALL_R,
              width: BALL_R*2, height: BALL_R*2, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%,#888,#2a2a2a 50%,#0d0d0d)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
              transform: `rotate(${ballRot}deg)`,
              zIndex: 10,
            }}>
              {ballUser && (
                <div style={{
                  position: 'absolute', bottom: BALL_R*2+4, left: '50%',
                  transform: `translateX(-50%) rotate(${-ballRot}deg)`,
                  background: 'rgba(0,0,0,0.75)', color: 'white',
                  fontSize: 13, fontWeight: 900, padding: '2px 8px',
                  borderRadius: 4, whiteSpace: 'nowrap',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>@{ballUser}</div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── HUD OVERLAYS ── */}

      {/* Score + multipliers (top-left) */}
      {phase !== 'idle' && phase !== 'auction' && phase !== 'chest_pick' && (
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 20,
          background: 'rgba(240,215,150,0.95)', border: '2px solid #8b5510',
          borderRadius: 8, padding: '7px 12px',
          boxShadow: '2px 2px 8px rgba(0,0,0,0.4)', minWidth: 140,
        }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#222' }}>
            Score: <span style={{ color: score>100?'#22aa22':score>50?'#aa9900':'#cc5500' }}>{score}</span>
          </div>
          <div style={{ fontSize: 13, color: '#444' }}>
            Rewards: <span style={{ fontWeight: 700, color: rewardLabel==='Good'?'#228822':'#888822' }}>{rewardLabel}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {[['🔫', multipliers.launch, '#ff4400'],
              ['💣', multipliers.bombs,  '#44aa00'],
              ['⭐', multipliers.power,  '#ff8800']].map(([icon, val, col]) => (
              <span key={icon} style={{ fontSize: 13, fontWeight: 900, color: col }}>{icon}{val}x</span>
            ))}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'rgba(20,20,40,0.7)',
            marginTop: 4, lineHeight: 1.1 }}>BALL<br/>GUYS</div>
        </div>
      )}

      {/* Round + best (corners) */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20,
        display: 'flex', gap: 10 }}>
        <div style={{ background: 'rgba(0,0,0,0.65)', borderRadius: 10,
          border: '2px solid rgba(0,200,100,0.4)', padding: '6px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>ROUND</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#00cc66' }}>#{roundCount}</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.65)', borderRadius: 10,
          border: '2px solid rgba(255,215,0,0.4)', padding: '6px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>BEST</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#ffd700', fontFamily: 'monospace' }}>
            {bestScore || '—'}
          </div>
        </div>
      </div>

      {/* Phase label */}
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#00ee66',
          textShadow: '0 0 20px rgba(0,238,102,0.5)' }}>💥 CANNON BLAST</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 400,
          fontFamily: 'sans-serif' }}>{phaseLabel}</div>
      </div>

      {/* Score big display during flight */}
      {(phase === 'flying' || phase === 'rolling') && (
        <div style={{ position: 'absolute', top: '62%', right: 16,
          textAlign: 'right', zIndex: 20 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.1em', fontFamily: 'sans-serif', fontWeight: 400 }}>SCORE</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#00ddff',
            fontFamily: 'monospace', lineHeight: 1,
            textShadow: '0 0 20px rgba(0,221,255,0.6)' }}>{score}</div>
        </div>
      )}

      {/* Boost banner */}
      {activeBoost && (
        <div style={{
          position: 'absolute', bottom: '38%', left: '50%',
          transform: 'translateX(-50%)',
          background: activeBoost.color || '#ff6600', color: 'black',
          fontWeight: 900, fontSize: 18, padding: '8px 28px',
          borderRadius: 12, boxShadow: `0 4px 20px ${activeBoost.color}99`,
          whiteSpace: 'nowrap', zIndex: 20,
        }}>
          {activeBoost.emoji} {activeBoost.label}{activeBoost.user ? ` from @${activeBoost.user}!` : '!'}
        </div>
      )}

      {/* Auction bids */}
      {phase === 'auction' && Object.keys(auctionBids).length > 0 && (
        <div style={{ position: 'absolute', bottom: '10%', left: '50%',
          transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)',
          borderRadius: 14, border: '2px solid rgba(255,215,0,0.4)',
          padding: '12px 18px', zIndex: 20, minWidth: 300 }}>
          <div style={{ color: '#ffd700', fontWeight: 900, fontSize: 15,
            textAlign: 'center', marginBottom: 8 }}>
            🏆 AUCTION — Highest gifter picks chests!
          </div>
          {Object.entries(auctionBids).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([u,c],i)=>(
            <div key={u} style={{ display:'flex', gap:8, marginBottom:4, alignItems:'center' }}>
              <span style={{ fontSize:16 }}>{['🥇','🥈','🥉','4.','5.'][i]}</span>
              <span style={{ flex:1, fontSize:14, fontWeight:700 }}>@{u}</span>
              <span style={{ color:'#ffd700', fontWeight:900, fontFamily:'monospace' }}>
                {c.toLocaleString()} 💎
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recent gifts */}
      {recentGifts.length > 0 && (phase === 'flying' || phase === 'rolling' || phase === 'charging') && (
        <div style={{ position: 'absolute', bottom: '10%', left: 16, zIndex: 20 }}>
          {recentGifts.slice(0, 4).map((g, i) => (
            <div key={g.ts} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(0,0,0,0.55)', borderRadius: 8,
              padding: '4px 12px', marginBottom: 4,
              opacity: 1 - i * 0.2,
            }}>
              <span style={{ fontSize: 16 }}>{g.tier.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>@{g.user}</span>
              <span style={{ color: g.tier.color, fontWeight: 900, fontSize: 13 }}>{g.tier.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 20,
          background: 'rgba(0,0,0,0.65)', borderRadius: 14,
          border: '1px solid rgba(255,215,0,0.25)', padding: '10px 14px',
          minWidth: 220 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,215,0,0.7)',
            letterSpacing: '0.12em', marginBottom: 6, textAlign: 'center' }}>
            🏆 LEADERBOARD
          </div>
          {leaderboard.slice(0, 5).map((l, i) => (
            <div key={l.ts ?? i} style={{ display: 'flex', gap: 8, alignItems: 'center',
              marginBottom: i < 4 ? 4 : 0,
              background: i === 0 ? 'rgba(255,215,0,0.08)' : 'transparent',
              borderRadius: 6, padding: '3px 6px' }}>
              <span style={{ fontSize: 14, width: 22 }}>{['🥇','🥈','🥉','4.','5.'][i]}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{l.user}</span>
              <span style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace',
                color: ['#ffd700','#c0c0c0','#cd7f32','#aaa','#aaa'][i] }}>
                {l.score}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Landing result */}
      {phase === 'landed' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'rgba(0,0,0,0.78)', border: '3px solid #ffd700',
          borderRadius: 18, padding: '22px 40px', textAlign: 'center', zIndex: 30 }}>
          <div style={{ color: '#ffd700', fontSize: 20, fontWeight: 900 }}>🏁 LANDED!</div>
          <div style={{ fontSize: 60, fontWeight: 900, fontFamily: 'monospace', color: 'white' }}>
            {score}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Best: {bestScore}</div>
        </div>
      )}
    </div>
  );
}
