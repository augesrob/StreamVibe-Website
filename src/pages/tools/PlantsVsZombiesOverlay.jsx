/**
 * PlantsVsZombiesOverlay — Portrait overlay for TikTok Live Studio
 * Route: /games-overlay/plants-vs-zombies?token=
 * TikTok recommended: 1080×1920px (9:16 portrait)
 */
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

export default function PlantsVsZombiesOverlay() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [authState, setAuthState] = useState('loading');
  const [userId, setUserId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [recentGifts, setRecentGifts] = useState([]);

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
    const ch = supabase.channel(`pvz:${userId}`)
      .on('broadcast', { event: 'state' }, ({ payload }) => setGameState(payload))
      .on('broadcast', { event: 'gift'  }, ({ payload }) => {
        setRecentGifts(prev => [{ ...payload, id: Date.now() }, ...prev].slice(0, 5));
        // Auto-remove after 5s
        setTimeout(() => {
          setRecentGifts(prev => prev.filter(g => g.id !== payload.id));
        }, 5000);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [authState, userId]);

  if (authState === 'loading') return null;
  if (authState === 'invalid') return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
      background:'#000', color:'#f87171', fontFamily:'monospace', fontSize:16, textAlign:'center', padding:32 }}>
      ❌ Invalid overlay URL.
    </div>
  );

  const score = gameState?.score ?? 0;
  const zombieCount = gameState?.zombieCount ?? 0;
  const giftZombies = gameState?.giftZombies ?? 0;
  const zbDieNo = gameState?.zbDieNo ?? 0;

  return (
    <div style={{ position:'fixed', inset:0, background:'transparent', display:'flex', flexDirection:'column',
      alignItems:'flex-start', justifyContent:'flex-start', fontFamily:'"Arial Black",Impact,sans-serif',
      padding:'20px', gap:'12px', pointerEvents:'none' }}>

      {/* Score badge */}
      <div style={{ background:'rgba(0,0,0,0.75)', borderRadius:16, border:'2px solid rgba(255,215,0,0.5)',
        padding:'12px 20px', backdropFilter:'blur(4px)' }}>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', letterSpacing:'0.12em' }}>☀️ SUN</div>
        <div style={{ fontSize:32, fontWeight:900, color:'#ffd700', lineHeight:1, fontFamily:'monospace' }}>{score}</div>
      </div>

      {/* Stats row */}
      <div style={{ display:'flex', gap:10 }}>
        <div style={{ background:'rgba(0,0,0,0.75)', borderRadius:12, border:'2px solid rgba(255,100,100,0.5)',
          padding:'8px 14px', textAlign:'center' }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em' }}>ON FIELD</div>
          <div style={{ fontSize:22, fontWeight:900, color:'#ff6644', lineHeight:1, fontFamily:'monospace' }}>🧟{zombieCount}</div>
        </div>
        <div style={{ background:'rgba(0,0,0,0.75)', borderRadius:12, border:'2px solid rgba(100,255,100,0.5)',
          padding:'8px 14px', textAlign:'center' }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em' }}>KILLED</div>
          <div style={{ fontSize:22, fontWeight:900, color:'#44ff88', lineHeight:1, fontFamily:'monospace' }}>💀{zbDieNo}</div>
        </div>
        <div style={{ background:'rgba(0,0,0,0.75)', borderRadius:12, border:'2px solid rgba(150,100,255,0.5)',
          padding:'8px 14px', textAlign:'center' }}>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.5)', letterSpacing:'0.1em' }}>GIFT 🧟</div>
          <div style={{ fontSize:22, fontWeight:900, color:'#aa88ff', lineHeight:1, fontFamily:'monospace' }}>🎁{giftZombies}</div>
        </div>
      </div>

      {/* Recent gift notifications */}
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
        {recentGifts.map(g => (
          <div key={g.id} style={{ background:'rgba(0,0,0,0.82)', borderRadius:12,
            border:`2px solid ${g.color}88`, padding:'10px 16px', backdropFilter:'blur(4px)',
            animation:'slideIn 0.3s ease', minWidth:200 }}>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', fontFamily:'sans-serif', fontWeight:400 }}>
              🎁 @{g.username} sent {g.coins}🪙
            </div>
            <div style={{ fontSize:16, fontWeight:900, color:g.color, marginTop:2 }}>{g.label}</div>
          </div>
        ))}
      </div>

      {/* Idle message */}
      {!gameState && (
        <div style={{ background:'rgba(0,0,0,0.75)', borderRadius:16, border:'2px solid rgba(255,215,0,0.3)',
          padding:'16px 24px', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🌻</div>
          <div style={{ fontSize:16, fontWeight:900, color:'#ffd700' }}>PLANTS vs ZOMBIES</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', fontFamily:'sans-serif', fontWeight:400, marginTop:4 }}>
            Gift to spawn zombies!
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-110%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>
    </div>
  );
}
