'use client'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function fmt(s: number) {
  const m = Math.floor(Math.max(0, s) / 60)
  const sec = Math.max(0, s) % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

interface BidEntry { user: string; coins: number; color: string }

interface OverlayState {
  phase: string
  remaining: number
  snipeDelay: number
  leader: { user: string; coins: number; color: string } | null
  minCoins: number
  theme: string
  bids: BidEntry[]
}

const DEFAULT_STATE: OverlayState = {
  phase: 'idle', remaining: 120, snipeDelay: 20,
  leader: null, minCoins: 1, theme: 'dark', bids: [],
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']
const MEDAL_EMOJI  = ['🥇', '🥈', '🥉']

export default function OverlayInner() {
  useEffect(() => {
    document.body.style.background = 'transparent'
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.background = '' }
  }, [])

  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [authState, setAuthState] = useState<'loading'|'valid'|'invalid'|'noPlan'>('loading')
  const [userId, setUserId]       = useState<string | null>(null)
  const [state, setState]         = useState<OverlayState>(DEFAULT_STATE)
  const [newLeader, setNewLeader] = useState<string | null>(null)
  const prevLeaderRef             = useRef<string | null>(null)

  useEffect(() => {
    if (!token) { setAuthState('invalid'); return }
    fetch(`/api/overlay/validate?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.userId) { setUserId(data.userId); setAuthState('valid') }
        else if (data.error === 'Basic plan or above required') setAuthState('noPlan')
        else setAuthState('invalid')
      })
      .catch(() => setAuthState('invalid'))
  }, [token])

  useEffect(() => {
    if (authState !== 'valid' || !userId) return
    const channel = supabase.channel(`overlay:${userId}`)
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        const s = { ...DEFAULT_STATE, ...(payload as OverlayState), bids: (payload as any)?.bids ?? [] }
        setState(s)
        if (s.leader && prevLeaderRef.current !== s.leader.user) {
          setNewLeader(s.leader.user)
          prevLeaderRef.current = s.leader.user
          setTimeout(() => setNewLeader(null), 4000)
        }
      })
      .subscribe()
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem('sv_auction_overlay_state')
        if (raw) {
          const parsed = JSON.parse(raw)
          setState({ ...DEFAULT_STATE, ...parsed, bids: parsed?.bids ?? [] })
        }
      } catch (_) {}
    }, 500)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [authState, userId])

  if (authState === 'loading') return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', color:'white', fontFamily:'monospace', fontSize:14 }}>
      Validating overlay...
    </div>
  )
  if (authState === 'invalid') return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#000', color:'#f87171', fontFamily:'monospace', fontSize:14, textAlign:'center', padding:32 }}>
      ❌ Invalid overlay URL. Generate a new one from your dashboard.
    </div>
  )
  if (authState === 'noPlan') return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#000', color:'#fbbf24', fontFamily:'monospace', fontSize:14, textAlign:'center', padding:32 }}>
      ⚠️ StreamVibe Basic plan required.
    </div>
  )

  return <AuctionWidget state={state} newLeader={newLeader} />
}

function AuctionWidget({ state, newLeader }: { state: OverlayState; newLeader: string | null }) {
  const { phase, remaining, snipeDelay, leader, minCoins } = state
  const bids: BidEntry[] = state.bids ?? []
  const isSnipe   = phase === 'snipe'
  const isRunning = phase === 'running' || phase === 'snipe'
  const isFinished = phase === 'finished'

  // Build top-3 unique leaders from bids (highest coin per user)
  const topBidders: BidEntry[] = []
  const seen = new Set<string>()
  for (const b of bids) {
    if (!seen.has(b.user)) { seen.add(b.user); topBidders.push(b) }
    if (topBidders.length === 3) break
  }
  // Pad to 3
  while (topBidders.length < 3) topBidders.push({ user: '?', coins: 0, color: '#555' })

  const totalParticipants = new Set(bids.map(b => b.user)).size

  // Timer color
  const timerColor =
    remaining <= 10 && remaining > 0 ? '#ef4444' :
    isSnipe ? '#fbbf24' : '#34d399'

  return (
    <>
      {/* New leader pop */}
      {newLeader && (
        <div style={{
          position: 'fixed', top: 40, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, textAlign: 'center',
          background: 'linear-gradient(135deg, #fbbf24, #f97316)',
          color: '#000', fontWeight: 900, fontFamily: 'monospace',
          letterSpacing: '0.15em', padding: '16px 40px', borderRadius: 16,
          boxShadow: '0 0 40px rgba(251,191,36,0.6)',
        }}>
          <div style={{ fontSize: 22 }}>👑 NEW LEADER!</div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>{newLeader}</div>
        </div>
      )}

      {/* Main widget — bottom-left */}
      <div style={{
        position: 'fixed',
        bottom: '3vh',
        left: '2vw',
        width: 'min(320px, 28vw)',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'linear-gradient(160deg, rgba(88,28,220,0.92) 0%, rgba(30,60,180,0.92) 50%, rgba(20,120,200,0.92) 100%)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
        fontFamily: '"Inter", "Segoe UI", sans-serif',
      }}>

        {/* Top badges row */}
        <div style={{ padding: '10px 14px 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* No Minimum / Min coins badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: minCoins <= 1 ? 'rgba(34,197,94,0.25)' : 'rgba(99,102,241,0.25)',
            border: `1px solid ${minCoins <= 1 ? 'rgba(34,197,94,0.5)' : 'rgba(99,102,241,0.5)'}`,
            borderRadius: 8, padding: '4px 10px',
          }}>
            <span style={{ fontSize: 11, color: minCoins <= 1 ? '#4ade80' : '#a5b4fc', fontWeight: 700, letterSpacing: '0.05em' }}>
              {minCoins <= 1 ? '✓ NO MINIMUM' : `MIN ${minCoins} 🪙`}
            </span>
          </div>

          {/* Snipe delay badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: isSnipe ? 'rgba(239,68,68,0.3)' : 'rgba(0,0,0,0.25)',
            border: `1px solid ${isSnipe ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 8, padding: '4px 8px',
            boxShadow: isSnipe ? '0 0 12px rgba(239,68,68,0.5)' : 'none',
          }}>
            <span style={{ fontSize: 11, color: '#fff', opacity: 0.7 }}>🛡 SNIPE DELAY</span>
            <span style={{
              background: isSnipe ? '#ef4444' : '#6366f1',
              color: '#fff', fontWeight: 900, fontSize: 11,
              padding: '2px 7px', borderRadius: 6,
            }}>{snipeDelay}S</span>
          </div>
        </div>

        {/* Timer */}
        <div style={{ textAlign: 'center', padding: '10px 14px 4px' }}>
          <div style={{
            fontSize: 'clamp(36px, 5vw, 52px)',
            fontWeight: 900,
            fontFamily: 'monospace',
            color: timerColor,
            letterSpacing: '0.05em',
            lineHeight: 1,
            textShadow: `0 0 20px ${timerColor}88`,
            transition: 'color 0.3s',
          }}>
            {fmt(remaining)}
          </div>
          {isSnipe && (
            <div style={{ fontSize: 10, color: '#fca5a5', fontWeight: 700, letterSpacing: '0.12em', marginTop: 2 }}>
              ⚡ SNIPE PROTECTION ACTIVE
            </div>
          )}
          {isFinished && (
            <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, letterSpacing: '0.12em', marginTop: 2 }}>
              🏁 AUCTION ENDED
            </div>
          )}
        </div>

        {/* Top 3 bidders */}
        <div style={{ padding: '4px 10px 6px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {topBidders.map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: i === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '6px 10px',
              border: i === 0 ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.07)',
              boxShadow: i === 0 ? '0 0 14px rgba(255,215,0,0.15)' : 'none',
            }}>
              {/* Medal */}
              <span style={{ fontSize: 16, flexShrink: 0 }}>{MEDAL_EMOJI[i]}</span>
              {/* Avatar circle */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: b.user !== '?' ? b.color : '#333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900, color: '#000',
                border: `2px solid ${MEDAL_COLORS[i]}44`,
              }}>
                {b.user !== '?' ? b.user[0]?.toUpperCase() : '?'}
              </div>
              {/* Name */}
              <div style={{
                flex: 1, minWidth: 0,
                fontSize: 12, fontWeight: 700, color: b.user !== '?' ? '#fff' : 'rgba(255,255,255,0.25)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {b.user !== '?' ? `@${b.user}` : '—'}
              </div>
              {/* Coins */}
              {b.coins > 0 && (
                <div style={{
                  fontSize: 11, fontWeight: 800, color: MEDAL_COLORS[i],
                  flexShrink: 0, letterSpacing: '0.02em',
                }}>
                  🪙 {b.coins.toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total participants footer */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '6px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600,
        }}>
          <span>👥</span>
          <span>Total participants: {totalParticipants}</span>
        </div>
      </div>
    </>
  )
}
