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

const PHASE_MAP: Record<string, { cls: string; label: string }> = {
  idle:     { cls: 'bg-gray-900/60 text-gray-500',             label: 'IDLE' },
  running:  { cls: 'bg-green-950/60 text-green-400',            label: '● LIVE' },
  snipe:    { cls: 'bg-red-950/60 text-red-400 animate-pulse',  label: '🛡 SNIPE' },
  paused:   { cls: 'bg-orange-950/60 text-orange-400',          label: 'PAUSED' },
  finished: { cls: 'bg-yellow-950/60 text-yellow-400',          label: '🏁 DONE' },
}

const THEMES: Record<string, string> = {
  dark:        'bg-[#0a0b14]/90',
  gradient:    'bg-gradient-to-br from-purple-700/85 to-cyan-500/75',
  neon:        'bg-[#001408]/90 border-green-500/50 shadow-[0_0_30px_rgba(0,230,118,0.2)]',
  red:         'bg-red-900/88',   blue:  'bg-blue-900/88',   green: 'bg-green-900/88',
  cyber:       'bg-gradient-to-br from-cyan-600/80 to-green-500/70',
  fire:        'bg-gradient-to-br from-orange-700/88 to-yellow-500/75',
  aurora:      'bg-gradient-to-br from-purple-600/80 to-cyan-500/70',
  rainbow:     'bg-gradient-to-r from-pink-600/80 via-yellow-500/70 to-cyan-500/80',
  pulse:       'bg-purple-800/88',
  matrix:      'bg-[#001405]/92 border-green-500/60',
  transparent: 'bg-black/40',
}

interface OverlayState {
  phase: string; remaining: number; snipeDelay: number
  leader: { user: string; coins: number } | null
  minCoins: number; theme: string
}

const DEFAULT_STATE: OverlayState = {
  phase: 'idle', remaining: 120, snipeDelay: 20,
  leader: null, minCoins: 1, theme: 'dark',
}

export default function OverlayInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [authState, setAuthState] = useState<'loading'|'valid'|'invalid'|'noPlan'>('loading')
  const [userId, setUserId]       = useState<string | null>(null)
  const [state, setState]         = useState<OverlayState>(DEFAULT_STATE)
  const [newLeader, setNewLeader] = useState<string | null>(null)
  const prevLeaderRef             = useRef<string | null>(null)

  // 1. Validate token server-side
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

  // 2. Subscribe to Realtime broadcast once valid
  useEffect(() => {
    if (authState !== 'valid' || !userId) return
    const channel = supabase.channel(`overlay:${userId}`)
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        const s = payload as OverlayState
        setState(s)
        if (s.leader && prevLeaderRef.current !== s.leader.user) {
          setNewLeader(s.leader.user)
          prevLeaderRef.current = s.leader.user
          setTimeout(() => setNewLeader(null), 4000)
        }
      })
      .subscribe()
    // localStorage fallback for same-browser use
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem('sv_auction_overlay_state')
        if (raw) setState(JSON.parse(raw))
      } catch (_) {}
    }, 500)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [authState, userId])

  if (authState === 'loading') return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 text-white font-mono text-sm">
      Validating overlay...
    </div>
  )
  if (authState === 'invalid') return (
    <div className="fixed inset-0 flex items-center justify-center bg-black text-red-400 font-mono text-sm text-center p-8">
      ❌ Invalid or expired overlay URL.<br/>Generate a new one from your dashboard.
    </div>
  )
  if (authState === 'noPlan') return (
    <div className="fixed inset-0 flex items-center justify-center bg-black text-yellow-400 font-mono text-sm text-center p-8">
      ⚠️ StreamVibe Basic plan required to use the overlay.
    </div>
  )

  const { phase, remaining, snipeDelay, leader, minCoins, theme } = state
  const phaseInfo  = PHASE_MAP[phase] || PHASE_MAP.idle
  const themeClass = THEMES[theme]    || THEMES.dark
  const timerColor =
    remaining <= 10 && remaining > 0 ? 'text-red-400 animate-pulse' :
    remaining <= snipeDelay && remaining > 0 ? 'text-yellow-400' : 'text-white'

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ width: 1920, height: 1080, background: 'transparent' }}>
      {newLeader && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 animate-in zoom-in-50 fade-in duration-300
          bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black font-mono tracking-widest
          px-10 py-5 rounded-2xl shadow-2xl shadow-yellow-500/50 text-center">
          <div className="text-2xl">👑 NEW LEADER!</div>
          <div className="text-base font-bold opacity-80 mt-1">{newLeader}</div>
        </div>
      )}
      <div className="absolute bottom-10 left-10 w-[400px]">
        <div className={`rounded-2xl border border-white/10 backdrop-blur-xl p-5 ${themeClass}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[10px] tracking-[0.2em] text-white/50 uppercase font-mono mb-0.5">Time Remaining</div>
              <div className={`font-mono text-5xl font-black leading-none ${timerColor}`}>{fmt(remaining)}</div>
            </div>
            <span className={`font-mono text-[11px] font-bold tracking-widest px-3 py-1 rounded ${phaseInfo.cls}`}>
              {phaseInfo.label}
            </span>
          </div>
          <div className="h-px bg-white/10 my-3" />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-[0.18em] text-white/40 uppercase font-mono mb-0.5">👑 Current Leader</div>
              <div className="font-mono text-lg font-black text-yellow-400 truncate max-w-[220px]"
                style={{ textShadow: '0 0 14px rgba(255,214,0,0.35)' }}>
                {leader ? leader.user : '—'}
              </div>
            </div>
            {leader && <div className="font-mono text-sm font-bold text-yellow-400/80">🪙 {leader.coins.toLocaleString()}</div>}
          </div>
          <div className="mt-3">
            <span className="text-[11px] font-mono font-bold bg-cyan-500/20 border border-cyan-500/30 rounded px-2 py-1 text-cyan-400">
              💎 MIN: {minCoins} coins
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
