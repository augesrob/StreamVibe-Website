'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useAuctionEngine } from '@/hooks/useAuctionEngine'
import { createClient } from '@supabase/supabase-js'

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BRIDGE_URL = 'wss://streamvibe-bridge-production.up.railway.app'

function fmt(s: number) {
  const m = Math.floor(Math.max(0, s) / 60)
  const sec = Math.max(0, s) % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function NewLeaderPop({ name }: { name: string }) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in zoom-in-50 fade-in duration-300">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black font-mono tracking-widest px-8 py-4 rounded-2xl shadow-2xl shadow-yellow-500/40 text-center">
        <div className="text-xl">👑 NEW LEADER!</div>
        <div className="text-sm font-bold opacity-80 mt-1">{name}</div>
      </div>
    </div>
  )
}

export default function AuctionPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const engine = useAuctionEngine()
  const wsRef = useRef<WebSocket | null>(null)

  const [hasBasic, setHasBasic]           = useState<boolean | null>(null)
  const [connStatus, setConnStatus]       = useState<'disconnected'|'connecting'|'connected'|'error'>('disconnected')
  const [connUser, setConnUser]           = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [connError, setConnError]         = useState<string | null>(null)
  const [overlayToken, setOverlayToken]   = useState<string | null>(null)

  useEffect(() => { if (!loading && !user) router.push('/login') }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    supabaseClient.from('user_plans').select('plans(tier)').eq('user_id', user.id).then(({ data }) => {
      const RANK: Record<string,number> = { free:0, basic:1, pro:2, legend:3 }
      const best = (data||[]).reduce((b:string,up:any) => {
        const t = up.plans?.tier||'free'; return (RANK[t]||0)>(RANK[b]||0)?t:b
      }, 'free')
      setHasBasic(RANK[best] >= RANK['basic'])
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    supabaseClient.from('profiles').select('overlay_token').eq('id', user.id).single()
      .then(({ data }) => { if (data?.overlay_token) setOverlayToken(data.overlay_token) })
  }, [user])

  // Broadcast to Supabase Realtime for overlay
  useEffect(() => {
    if (!user) return
    supabaseClient.channel(`overlay:${user.id}`).send({
      type: 'broadcast', event: 'state',
      payload: {
        phase: engine.phase, remaining: engine.remaining,
        snipeDelay: engine.snipeDelay, leader: engine.leader,
        minCoins: engine.minCoins, theme: engine.theme,
        bids: engine.bids.slice(0, 50),
      }
    })
  }, [engine.phase, engine.remaining, engine.snipeDelay, engine.leader, engine.minCoins, engine.theme, engine.bids, user])

  // LocalStorage fallback for same-browser overlay
  useEffect(() => {
    try {
      localStorage.setItem('sv_auction_overlay_state', JSON.stringify({
        phase: engine.phase, remaining: engine.remaining,
        snipeDelay: engine.snipeDelay, leader: engine.leader,
        minCoins: engine.minCoins, theme: engine.theme,
        bids: engine.bids.slice(0, 50),
      }))
    } catch (_) {}
  }, [engine.phase, engine.remaining, engine.snipeDelay, engine.leader, engine.minCoins, engine.theme, engine.bids])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: 'disconnect_tiktok' })); wsRef.current.close() } catch(_) {}
      wsRef.current = null
    }
    setConnStatus('disconnected')
    setConnUser('')
  }, [])

  const connect = useCallback((username: string) => {
    disconnect()
    const clean = username.replace('@', '').trim()
    if (!clean) return
    setConnUser(clean)
    setConnStatus('connecting')
    setConnError(null)

    const ws = new WebSocket(BRIDGE_URL)
    wsRef.current = ws

    ws.onopen  = () => ws.send(JSON.stringify({ type: 'connect_tiktok', username: clean }))
    ws.onclose = () => setConnStatus('disconnected')
    ws.onerror = () => { setConnStatus('error'); setConnError('Could not reach StreamVibe Bridge.') }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        switch (msg.type) {
          case 'tiktok_connected':
            setConnStatus('connected'); setConnError(null); break
          case 'not_live':
            setConnError('@' + clean + ' is not live yet. Retrying every 30s…')
            setConnStatus('connecting'); break
          case 'tiktok_disconnected':
            setConnStatus('disconnected'); break
          case 'gift':
            if (msg.repeatEnd === false) return
            const coins = (msg.coins || 0) * Math.max(1, msg.repeatCount || 1)
            if (coins > 0) engine.processBid(msg.username || 'unknown', coins)
            break
          case 'error':
            setConnError(msg.message || 'Bridge error'); break
        }
      } catch(_) {}
    }
  }, [disconnect, engine])

  const injectTestBid = () =>
    engine.processBid('user' + Math.floor(Math.random()*999), Math.floor(Math.random()*500)+50)

  const earnings  = engine.bids.reduce((s, b) => s + b.coins, 0)
  const isRunning = engine.phase === 'running' || engine.phase === 'snipe'
  const isIdle    = engine.phase === 'idle'
  const isFinished = engine.phase === 'finished'
  const isPaused  = engine.phase === 'paused'
  const durMin    = Math.floor(engine.totalDuration / 60)
  const durSec    = engine.totalDuration % 60

  const statusDot: Record<string,string> = {
    disconnected: 'bg-gray-600', connecting: 'bg-orange-400 animate-pulse',
    connected: 'bg-green-500 shadow-[0_0_8px_#00e676]', error: 'bg-red-500',
  }

  const timerCls = engine.remaining <= 10 && engine.remaining > 0
    ? 'text-red-500 animate-pulse'
    : engine.remaining <= engine.snipeDelay && engine.remaining > 0 ? 'text-yellow-400' : 'text-green-400'

  const phaseStyle: Record<string,string> = {
    idle:'bg-gray-900/50 text-gray-500', running:'bg-green-950/30 text-green-400',
    snipe:'bg-red-950/30 text-red-400 animate-pulse', paused:'bg-orange-950/30 text-orange-400',
    finished:'bg-yellow-950/30 text-yellow-400',
  }
  const phaseLabel: Record<string,string> = {
    idle:'–', running:'● LIVE', snipe:'🛡 SNIPE', paused:'PAUSED', finished:'🏁 DONE'
  }

  if (!loading && user && hasBasic === false) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0b14] text-white text-center p-8 mt-16">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="text-2xl font-black font-mono mb-2">Basic Plan Required</h2>
      <p className="text-gray-400 mb-6">The Live Auction Tool requires a Basic plan or above.</p>
      <a href="/billing" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-bold rounded-xl">View Plans</a>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-64px)] mt-16 bg-[#0a0b14] text-white overflow-hidden">
      {engine.newLeaderName && <NewLeaderPop name={engine.newLeaderName} />}

      {/* LEFT PANEL */}
      <div className="w-[300px] flex-shrink-0 border-r border-[#1e2240] bg-[#10121f] flex flex-col gap-4 p-4 overflow-y-auto">
        <div>
          <div className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase mb-2">Live Status</div>
          <div className="border border-[#1e2240] rounded-xl p-4 text-center bg-[#0a0b14]">
            <div className="text-xs text-gray-500 tracking-widest uppercase mb-1">Time Remaining</div>
            <div className={`font-mono text-5xl font-black ${timerCls}`}>{fmt(engine.remaining)}</div>
          </div>
        </div>
        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
          <div className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase mb-3">⏱ Timer Settings</div>
          <div className="text-xs text-gray-400 mb-2 font-semibold">Match Duration</div>
          <div className="flex items-center gap-2">
            <div>
              <input type="number" min={0} max={99} defaultValue={durMin}
                onChange={e => engine.setDuration((+e.target.value||0)*60 + durSec)}
                className="w-14 bg-[#0a0b14] border border-[#1e2240] rounded-lg text-center font-mono text-xl font-black text-white p-2 outline-none focus:border-cyan-500" />
              <div className="text-[10px] text-gray-500 text-center mt-1">min</div>
            </div>
            <div className="font-mono text-xl font-black text-gray-500 pb-3">:</div>
            <div>
              <input type="number" min={0} max={59} defaultValue={durSec}
                onChange={e => engine.setDuration(durMin*60 + (+e.target.value||0))}
                className="w-14 bg-[#0a0b14] border border-[#1e2240] rounded-lg text-center font-mono text-xl font-black text-white p-2 outline-none focus:border-cyan-500" />
              <div className="text-[10px] text-gray-500 text-center mt-1">sec</div>
            </div>
          </div>
        </div>
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
          <div className="text-[11px] font-bold tracking-widest text-red-400 uppercase mb-3">🛡 Snipe Delay</div>
          <div className="text-center">
            <input type="number" min={1} max={300} value={engine.snipeDelay}
              onChange={e => engine.setSnipeDelay(+e.target.value||5)}
              className="w-24 bg-[#0a0b14] border border-red-900/40 rounded-lg text-center font-mono text-2xl font-black text-red-400 p-2 outline-none" />
            <div className="text-xs text-red-900 mt-1">sec</div>
            <div className="text-[10px] text-red-900/70 mt-1">Added when entry in last seconds</div>
          </div>
        </div>
        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-bold tracking-widest text-purple-400 uppercase">📺 Overlay Badges</div>
            <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded font-bold">NEW</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="accent-cyan-500 w-4 h-4" />
            <span className="font-bold text-sm flex-1">💎 MINIMUM</span>
            <input type="number" min={1} value={engine.minCoins}
              onChange={e => engine.setMinCoins(+e.target.value||1)}
              className="w-14 bg-[#0a0b14] border border-[#1e2240] rounded text-center font-mono font-bold text-sm text-white p-1 outline-none" />
            <span className="text-xs text-gray-500">coins</span>
          </div>
        </div>
        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4 flex-1">
          <div className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase mb-3">📋 Session History</div>
          {engine.sessionHistory.length === 0
            ? <div className="text-gray-600 text-sm text-center py-4">No sessions yet</div>
            : <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                {engine.sessionHistory.map((s, i) => (
                  <div key={i} className="bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-2 flex justify-between text-xs">
                    <span className="text-yellow-400 font-bold font-mono">👑 {s.winner}</span>
                    <span className="text-gray-500">🪙 {s.coins.toLocaleString()} · {s.date}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* CENTER */}
      <div className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto">
        <div className="flex gap-2">
          <button onClick={() => { const url = overlayToken ? '/overlay?token='+overlayToken : '/overlay'; window.open(url,'_blank') }}
            className="flex-1 py-2 rounded-lg border border-[#1e2240] bg-[#151828] text-gray-400 hover:border-cyan-600 hover:text-cyan-400 font-mono text-xs font-bold tracking-widest transition-all">
            🖥 Overlay Preview
          </button>
          <button onClick={() => router.push('/tools/overlay-setup')}
            className="flex-1 py-2 rounded-lg border border-[#1e2240] bg-[#151828] text-gray-400 hover:border-purple-600 hover:text-purple-400 font-mono text-xs font-bold tracking-widest transition-all">
            🎨 Overlay Setup
          </button>
        </div>

        <div className="bg-green-950/20 border border-green-900/30 rounded-xl p-3 flex items-center gap-4">
          <span className="text-xl">🪙</span>
          <div>
            <div className="text-[11px] text-green-700 font-semibold uppercase tracking-widest">Your Earnings (43%)</div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-black text-green-400">{earnings.toLocaleString()}</span>
              <span className="text-green-600 text-sm">${(earnings * 0.0065).toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        <div className="bg-cyan-950/20 border border-cyan-900/20 rounded-xl p-3 text-cyan-700 text-sm">
          💡 Enter your TikTok username and click Connect to start receiving live gifts
        </div>

        {connError && (
          <div className="bg-orange-950/30 border border-orange-700/40 rounded-xl p-3 flex items-center justify-between text-orange-300 text-sm">
            <span>⚠️ {connError}</span>
            <button onClick={() => setConnError(null)} className="ml-3 text-orange-600 hover:text-orange-400 font-bold">✕</button>
          </div>
        )}

        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
          <button onClick={() => connStatus === 'connected' ? disconnect() : connect(usernameInput)}
            className={`w-full py-3 rounded-lg font-mono font-black text-sm tracking-widest flex items-center justify-center gap-2 transition-all ${
              connStatus === 'connected'
                ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                : connStatus === 'connecting'
                  ? 'bg-orange-900/50 border border-orange-700/50 text-orange-300 cursor-default'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-black shadow-lg shadow-cyan-500/20'
            }`}>
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot[connStatus]}`} />
            {connStatus === 'connected'
              ? 'CONNECTED (@' + connUser + ') — Click to Disconnect'
              : connStatus === 'connecting'
                ? 'WAITING FOR LIVE…'
                : connStatus === 'error'
                  ? '⟳ RETRY CONNECTION'
                  : '♪  CONNECT MY LIVE'}
          </button>
          {connStatus !== 'connected' && (
            <input value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && connect(usernameInput)}
              placeholder="@yourtiktokusername"
              className="mt-3 w-full bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-2 text-white placeholder:text-gray-600 font-semibold focus:border-cyan-500 outline-none" />
          )}
        </div>

        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={engine.start} disabled={isRunning}
              className="py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 disabled:opacity-30 disabled:cursor-not-allowed text-black font-mono font-black text-xs tracking-widest hover:from-green-400 hover:to-green-500 transition-all">
              ▶ START MATCH
            </button>
            <button onClick={engine.pause} disabled={isIdle || isFinished}
              className="py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono font-black text-xs tracking-widest hover:from-orange-500 hover:to-orange-600 transition-all">
              {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
            </button>
            <button onClick={engine.finish} disabled={isIdle || isFinished}
              className="col-span-2 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-800 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono font-black text-xs tracking-widest hover:from-red-600 hover:to-red-700 transition-all">
              🏁 FINISH
            </button>
            <button onClick={engine.restart}
              className="col-span-2 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-purple-800 text-white font-mono font-black text-xs tracking-widest hover:from-purple-600 hover:to-purple-700 transition-all">
              ↺ RESTART
            </button>
          </div>
        </div>

        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
          <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase text-center mb-3">⏱ QUICK TIME ADJUST</div>
          <div className="flex gap-2 justify-center">
            {([[-30,'red'],[-10,'red'],[+10,'green'],[+30,'green']] as [number,string][]).map(([d,c]) => (
              <button key={d} onClick={() => engine.adjust(d)}
                className={`px-4 py-2 rounded-lg font-mono text-xs font-bold border transition-all ${
                  c === 'red'
                    ? 'bg-red-950/30 border-red-900/40 text-red-400 hover:bg-red-900/30'
                    : 'bg-green-950/30 border-green-900/40 text-green-400 hover:bg-green-900/30'
                }`}>
                {d > 0 ? '+'+d+'s' : d+'s'}
              </button>
            ))}
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <button onClick={injectTestBid} className="text-xs text-gray-700 hover:text-gray-500 border border-gray-800 rounded-lg py-2 text-center transition-colors">
            🧪 Inject Test Bid (dev only)
          </button>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="w-[275px] flex-shrink-0 border-l border-[#1e2240] bg-[#10121f] flex flex-col gap-4 p-4 overflow-y-auto">
        <div className="bg-gradient-to-br from-yellow-950/20 to-orange-950/10 border border-yellow-900/25 rounded-xl p-4">
          <div className="text-[10px] font-bold tracking-widest text-yellow-700 uppercase mb-1">👑 Current Leader</div>
          <div className="font-mono font-black text-lg text-yellow-400 truncate">
            {engine.leader ? engine.leader.user : 'None'}
          </div>
          {engine.leader && <div className="text-sm text-yellow-700 mt-0.5">🪙 {engine.leader.coins.toLocaleString()} coins</div>}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-600">PHASE</span>
            <span className={`font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 rounded ${phaseStyle[engine.phase] || phaseStyle.idle}`}>
              {phaseLabel[engine.phase] || '–'}
            </span>
          </div>
        </div>
        {engine.phase === 'snipe' && (
          <div className="bg-red-950/20 border border-red-700/40 rounded-xl p-3 text-center text-red-400 font-mono font-bold text-xs tracking-widest animate-pulse">
            🛡 SNIPE ZONE ACTIVE!
          </div>
        )}
        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4 flex flex-col flex-1 min-h-0">
          <div className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase mb-3">📊 Bid Feed</div>
          <div className="flex flex-col gap-2 overflow-y-auto flex-1">
            {engine.bids.length === 0
              ? <div className="text-gray-600 text-sm text-center py-6">Bids will appear here</div>
              : engine.bids.map((b, i) => (
                  <div key={b.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 animate-in fade-in duration-200 ${
                    i === 0 ? 'bg-yellow-950/20 border border-yellow-900/30' : 'bg-[#0a0b14] border border-[#1e2240]'
                  }`}>
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-mono font-black text-xs text-black"
                      style={{ background: b.color }}>
                      {b.user[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 font-bold text-sm truncate">{b.user}</div>
                    <div className="font-mono text-xs font-bold text-yellow-400 flex-shrink-0">🪙 {b.coins.toLocaleString()}</div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
