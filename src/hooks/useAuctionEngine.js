import { useState, useRef, useCallback, useEffect } from 'react';

const COLORS = [
  '#00e5ff','#00e676','#ffd600','#ff6d00',
  '#7c4dff','#ff1744','#ab47bc','#26c6da',
  '#ff6090','#69f0ae','#ea80fc','#ffab40',
];

export function useAuctionEngine() {
  const [phase, setPhase]           = useState('idle');   // idle|running|paused|snipe|finished
  const [remaining, setRemaining]   = useState(120);
  const [totalDuration, setTotalDuration] = useState(120);
  const [snipeDelay, setSnipeDelay] = useState(20);
  const [minCoins, setMinCoins]     = useState(1);
  const [leader, setLeader]         = useState(null);
  const [bids, setBids]             = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [theme, setTheme]           = useState('dark');
  const [newLeaderName, setNewLeaderName] = useState(null);

  const phaseRef    = useRef('idle');
  const remainRef   = useRef(120);
  const snipeRef    = useRef(20);
  const leaderRef   = useRef(null);
  const bidCountRef = useRef(0);
  const timerRef    = useRef(null);

  // keep refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { remainRef.current = remaining; }, [remaining]);
  useEffect(() => { snipeRef.current = snipeDelay; }, [snipeDelay]);
  useEffect(() => { leaderRef.current = leader; }, [leader]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      const p = phaseRef.current;
      if (p !== 'running' && p !== 'snipe') return;
      setRemaining(prev => {
        const next = Math.max(0, prev - 1);
        remainRef.current = next;
        if (next === 0) {
          stopTimer();
          setPhase('finished');
          phaseRef.current = 'finished';
          const cur = leaderRef.current;
          if (cur) {
            setSessionHistory(h => [{
              winner: cur.user, coins: cur.coins,
              date: new Date().toLocaleTimeString()
            }, ...h].slice(0, 20));
          }
        }
        return next;
      });
    }, 1000);
  }, [stopTimer]);

  const start = useCallback(() => {
    const wasIdle = phaseRef.current === 'idle' || phaseRef.current === 'finished';
    if (wasIdle) {
      setRemaining(totalDuration);
      remainRef.current = totalDuration;
      setLeader(null);
      setBids([]);
      bidCountRef.current = 0;
    }
    setPhase('running');
    phaseRef.current = 'running';
    startTimer();
  }, [totalDuration, startTimer]);

  const pause = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'running' || p === 'snipe') {
      stopTimer();
      setPhase('paused');
      phaseRef.current = 'paused';
    } else if (p === 'paused') {
      const p2 = remainRef.current <= snipeRef.current ? 'snipe' : 'running';
      setPhase(p2);
      phaseRef.current = p2;
      startTimer();
    }
  }, [stopTimer, startTimer]);

  const finish = useCallback(() => {
    stopTimer();
    setPhase('finished');
    phaseRef.current = 'finished';
    const cur = leaderRef.current;
    if (cur) {
      setSessionHistory(h => [{
        winner: cur.user, coins: cur.coins,
        date: new Date().toLocaleTimeString()
      }, ...h].slice(0, 20));
    }
  }, [stopTimer]);

  const restart = useCallback(() => {
    stopTimer();
    setPhase('idle');
    phaseRef.current = 'idle';
    setRemaining(totalDuration);
    remainRef.current = totalDuration;
    setLeader(null);
    setBids([]);
    bidCountRef.current = 0;
  }, [stopTimer, totalDuration]);

  const adjust = useCallback((delta) => {
    setRemaining(prev => {
      const next = Math.max(0, prev + delta);
      remainRef.current = next;
      return next;
    });
  }, []);

  const setDuration = useCallback((secs) => {
    setTotalDuration(secs);
    if (phaseRef.current === 'idle') {
      setRemaining(secs);
      remainRef.current = secs;
    }
  }, []);

  /** Called by TikTok connector when a valid gift arrives */
  const processBid = useCallback((user, coins) => {
    const p = phaseRef.current;
    if (p !== 'running' && p !== 'snipe') return;
    if (coins < minCoins) return;

    // Snipe protection
    if (p === 'running' && remainRef.current <= snipeRef.current) {
      setPhase('snipe');
      phaseRef.current = 'snipe';
      setRemaining(snipeRef.current);
      remainRef.current = snipeRef.current;
    } else if (p === 'snipe') {
      setRemaining(snipeRef.current);
      remainRef.current = snipeRef.current;
    }

    const color = COLORS[bidCountRef.current % COLORS.length];
    bidCountRef.current++;

    const bid = { user, coins, color, id: Date.now() };
    setBids(prev => [bid, ...prev].slice(0, 50));

    const prev = leaderRef.current;
    if (!prev || coins > prev.coins) {
      const newLeader = { user, coins, color };
      setLeader(newLeader);
      leaderRef.current = newLeader;
      if (prev?.user !== user) {
        setNewLeaderName(user);
        setTimeout(() => setNewLeaderName(null), 4000);
      }
    }
  }, [minCoins]);

  // cleanup on unmount
  useEffect(() => () => stopTimer(), [stopTimer]);

  return {
    // state
    phase, remaining, totalDuration, snipeDelay, minCoins,
    leader, bids, sessionHistory, theme, newLeaderName,
    // actions
    start, pause, finish, restart, adjust,
    setDuration,
    setSnipeDelay: useCallback(v => { setSnipeDelay(v); snipeRef.current = v; }, []),
    setMinCoins:   useCallback(v => setMinCoins(Math.max(1, v)), []),
    setTheme,
    processBid,
  };
}
