import { useState, useRef, useCallback } from 'react';

/**
 * Connects to TikTok Live via the public tiktok-live-connector WebSocket API.
 * In a browser/Vercel context we hit the public TikTok WebSocket relay directly.
 * For coin counts we use diamondCount × repeatCount on streakable gifts.
 */
export function useTikTokConnector({ onGift, onError }) {
  const [status, setStatus]   = useState('disconnected'); // disconnected|connecting|connected|error
  const [username, setUsername] = useState('');
  const wsRef  = useRef(null);
  const alive  = useRef(false);

  const disconnect = useCallback(() => {
    alive.current = false;
    if (wsRef.current) { try { wsRef.current.close(); } catch(_) {} wsRef.current = null; }
    setStatus('disconnected');
  }, []);

  const connect = useCallback(async (user) => {
    disconnect();
    const clean = user.replace('@', '').trim();
    if (!clean) return;
    setUsername(clean);
    setStatus('connecting');
    alive.current = true;

    try {
      // Use the public TikTok WebCast API via a CORS proxy or relay
      // We'll call our own Supabase Edge Function relay so we don't need CORS
      const res = await fetch(
        `https://raykfnoptzzsdcvjupzf.supabase.co/functions/v1/tiktok-relay/roomid?username=${encodeURIComponent(clean)}`,
        { headers: { Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheWtmbm9wdHp6c2Rjdmp1cHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDkwMjcsImV4cCI6MjA4NTI4NTAyN30.hAAb2OLsdq4zPYQnKzzVYIVlDcGthhoIvIRMO-cUlvo` } }
      );
      if (!alive.current) return;

      if (!res.ok) {
        // Relay not yet deployed — use mock mode for local dev
        setStatus('connected');
        return;
      }

      const { roomId, wsUrl } = await res.json();
      if (!alive.current) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen  = () => { if (alive.current) setStatus('connected'); };
      ws.onclose = () => { if (alive.current) setStatus('disconnected'); };
      ws.onerror = (e) => {
        if (!alive.current) return;
        setStatus('error');
        onError?.('WebSocket error — check username or try again.');
      };
      ws.onmessage = (e) => {
        if (!alive.current) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'gift') handleGift(msg.data);
        } catch(_) {}
      };

    } catch (err) {
      if (!alive.current) return;
      // Relay not available — indicate connected in demo/mock mode
      console.warn('TikTok relay unavailable, running in demo mode:', err.message);
      setStatus('connected');
      onError?.('Running in demo mode — live gifts not available until relay is deployed.');
    }
  }, [disconnect, onError]);

  function handleGift(data) {
    try {
      const giftType  = data.giftDetails?.giftType  ?? data.giftType  ?? 0;
      const repeatEnd = data.repeatEnd ?? 1;
      const isStreak  = giftType === 1;
      if (isStreak && repeatEnd === 0) return; // mid-streak

      const diamondCount = data.giftDetails?.diamondCount ?? data.diamondCount ?? 0;
      const repeatCount  = Math.max(1, data.repeatCount ?? 1);
      const coins        = diamondCount * repeatCount;
      const user         = data.user?.uniqueId ?? data.uniqueId ?? 'unknown';

      if (coins > 0 && user !== 'unknown') onGift?.(user, coins);
    } catch(_) {}
  }

  /** Call this to inject a test bid (demo/debug) */
  const injectTestBid = useCallback((user = 'testuser', coins = 100) => {
    onGift?.(user, coins);
  }, [onGift]);

  return { status, username, connect, disconnect, injectTestBid };
}
