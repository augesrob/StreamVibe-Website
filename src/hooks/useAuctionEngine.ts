'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

export type Phase = 'idle' | 'running' | 'paused' | 'snipe' | 'finished'

export interface Bid {
  id: number
  user: string
  coins: number
  color: string
}

export interface Leader {
  user: string
  coins: number
  color: string
}

export interface HistoryEntry {
  winner: string
  coins: number
  date: string
}

const COLORS = [
  '#00e5ff','#00e676','#ffd600','#ff6d00',
  '#7c4dff','#ff1744','#ab47bc','#26c6da',
  '#ff6090','#69f0ae','#ea80fc','#ffab40',
]

export function useAuctionEngine() {
  const [phase, setPhase]               = useState<Phase>('idle')
  const [remaining, setRemaining]       = useState(120)
  const [totalDuration, setTotalDuration] = useState(120)
  const [snipeDelay, setSnipeDelay]     = useState(20)
  const [minCoins, setMinCoins]         = useState(1)
  const [leader, setLeader]             = useState<Leader | null>(null)
  const [bids, setBids]                 = useState<Bid[]>([])
  const [sessionHistory, setSessionHistory] = useState<HistoryEntry[]>([])
  const [theme, setTheme]               = useState('dark')
  const [newLeaderName, setNewLeaderName] = useState<string | null>(null)

  const phaseRef      = useRef<Phase>('idle')
  const remainRef     = useRef(120)
  const snipeRef      = useRef(20)
  const leaderRef     = useRef<Leader | null>(null)
  const bidCountRef   = useRef(0)
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const nlTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { phaseRef.current = phase },       [phase])
  useEffect(() => { remainRef.current = remaining },  [remaining])
  useEffect(() => { snipeRef.current = snipeDelay },  [snipeDelay])
  useEffect(() => { leaderRef.current = leader },     [leader])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const recordSession = useCallback(() => {
    const cur = leaderRef.current
    if (cur) {
      setSessionHistory(h => [{
        winner: cur.user, coins: cur.coins,
        date: new Date().toLocaleTimeString()
      }, ...h].slice(0, 20))
    }
  }, [])

  const startTimer = useCallback(() => {
    stopTimer()
    timerRef.current = setInterval(() => {
      const p = phaseRef.current
      if (p !== 'running' && p !== 'snipe') return
      setRemaining(prev => {
        const next = Math.max(0, prev - 1)
        remainRef.current = next
        if (next === 0) {
          stopTimer()
          setPhase('finished')
          phaseRef.current = 'finished'
          recordSession()
        }
        return next
      })
    }, 1000)
  }, [stopTimer, recordSession])

  const start = useCallback(() => {
    const wasIdle = phaseRef.current === 'idle' || phaseRef.current === 'finished'
    if (wasIdle) {
      setRemaining(totalDuration); remainRef.current = totalDuration
      setLeader(null); setBids([]); bidCountRef.current = 0
    }
    setPhase('running'); phaseRef.current = 'running'
    startTimer()
  }, [totalDuration, startTimer])

  const pause = useCallback(() => {
    const p = phaseRef.current
    if (p === 'running' || p === 'snipe') {
      stopTimer(); setPhase('paused'); phaseRef.current = 'paused'
    } else if (p === 'paused') {
      const p2: Phase = remainRef.current <= snipeRef.current ? 'snipe' : 'running'
      setPhase(p2); phaseRef.current = p2; startTimer()
    }
  }, [stopTimer, startTimer])

  const finish = useCallback(() => {
    stopTimer(); setPhase('finished'); phaseRef.current = 'finished'; recordSession()
  }, [stopTimer, recordSession])

  const restart = useCallback(() => {
    stopTimer(); setPhase('idle'); phaseRef.current = 'idle'
    setRemaining(totalDuration); remainRef.current = totalDuration
    setLeader(null); setBids([]); bidCountRef.current = 0
  }, [stopTimer, totalDuration])

  const adjust = useCallback((delta: number) => {
    setRemaining(prev => { const n = Math.max(0, prev + delta); remainRef.current = n; return n })
  }, [])

  const setDuration = useCallback((secs: number) => {
    setTotalDuration(secs)
    if (phaseRef.current === 'idle') { setRemaining(secs); remainRef.current = secs }
  }, [])

  const processBid = useCallback((user: string, coins: number) => {
    const p = phaseRef.current
    if (p !== 'running' && p !== 'snipe') return
    if (coins < minCoins) return

    // Snipe protection
    if (p === 'running' && remainRef.current <= snipeRef.current) {
      setPhase('snipe'); phaseRef.current = 'snipe'
      setRemaining(snipeRef.current); remainRef.current = snipeRef.current
    } else if (p === 'snipe') {
      setRemaining(snipeRef.current); remainRef.current = snipeRef.current
    }

    const color = COLORS[bidCountRef.current % COLORS.length]
    bidCountRef.current++
    const bid: Bid = { id: Date.now(), user, coins, color }
    setBids(prev => [bid, ...prev].slice(0, 50))

    const prev = leaderRef.current
    if (!prev || coins > prev.coins) {
      const newLeader: Leader = { user, coins, color }
      setLeader(newLeader); leaderRef.current = newLeader
      if (prev?.user !== user) {
        setNewLeaderName(user)
        if (nlTimerRef.current) clearTimeout(nlTimerRef.current)
        nlTimerRef.current = setTimeout(() => setNewLeaderName(null), 4000)
      }
    }
  }, [minCoins])

  useEffect(() => () => {
    stopTimer()
    if (nlTimerRef.current) clearTimeout(nlTimerRef.current)
  }, [stopTimer])

  return {
    phase, remaining, totalDuration, snipeDelay, minCoins,
    leader, bids, sessionHistory, theme, newLeaderName,
    start, pause, finish, restart, adjust,
    setDuration,
    setSnipeDelay: useCallback((v: number) => { setSnipeDelay(v); snipeRef.current = v }, []),
    setMinCoins:   useCallback((v: number) => setMinCoins(Math.max(1, v)), []),
    setTheme,
    processBid,
  }
}
