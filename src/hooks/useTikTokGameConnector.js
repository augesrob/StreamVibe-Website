/**
 * useTikTokGameConnector
 * Extended TikTok connector that fires BOTH gift and chat events.
 * Drop-in replacement for useTikTokConnector when a game needs chat.
 */
import { useState, useRef, useCallback } from 'react';

const RELAY_URL  = 'https://raykfnoptzzsdcvjupzf.supabase.co/functions/v1/tiktok-relay';
const RELAY_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheWtmbm9wdHp6c2Rjdmp1cHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDkwMjcsImV4cCI6MjA4NTI4NTAyN30.hAAb2OLsdq4zPYQnKzzVYIVlDcGthhoIvIRMO-cUlvo';

export function useTikTokGameConnector({ onGift, onChat, onError }) {
  const [status,   setStatus]   = useState('disconnected');
  const [username, setUsername] = useState('');
  const wsRef  = useRef(null);
  const alive  = useRef(false);

  const disconnect = useCallback(() => {
    alive.current = false;
    if (wsRef.current) { try { wsRef.current.close(); } catch (_) {} wsRef.current = null; }
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
      const res = await fetch(`${RELAY_URL}/roomid?username=${encodeURIComponent(clean)}`, {
        headers: { Authorization: `Bearer ${RELAY_KEY}` },
      });
      if (!alive.current) return;

      if (!res.ok) { setStatus('connected'); return; } // demo mode

      const { wsUrl } = await res.json();
      if (!alive.current) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen  = () => { if (alive.current) setStatus('connected'); };
      ws.onclose = () => { if (alive.current) setStatus('disconnected'); };
      ws.onerror = () => {
        if (!alive.current) return;
        setStatus('error');
        onError?.('WebSocket error — check username or try again.');
      };
      ws.onmessage = (e) => {
        if (!alive.current) return;
        try {
          const msg = JSON.parse(e.data);
          if      (msg.type === 'gift') handleGift(msg.data);
          else if (msg.type === 'chat') handleChat(msg.data);
        } catch (_) {}
      };
    } catch (err) {
      if (!alive.current) return;
      console.warn('TikTok relay unavailable, demo mode:', err.message);
      setStatus('connected');
      onError?.('Running in demo mode — live chat not active until relay is deployed.');
    }
  }, [disconnect, onError]);

  function handleGift(data) {
    try {
      const giftType  = data.giftDetails?.giftType ?? data.giftType ?? 0;
      const repeatEnd = data.repeatEnd ?? 1;
      if (giftType === 1 && repeatEnd === 0) return;
      const diamonds = data.giftDetails?.diamondCount ?? data.diamondCount ?? 0;
      const repeat   = Math.max(1, data.repeatCount ?? 1);
      const coins    = diamonds * repeat;
      const user     = data.user?.uniqueId ?? data.uniqueId ?? 'unknown';
      if (coins > 0 && user !== 'unknown') onGift?.(user, coins);
    } catch (_) {}
  }

  function handleChat(data) {
    try {
      const user    = data.user?.uniqueId ?? data.uniqueId ?? 'unknown';
      const comment = data.comment ?? data.text ?? '';
      if (user !== 'unknown' && comment) onChat?.(user, comment.trim());
    } catch (_) {}
  }

  /** Inject a fake chat message (dev/demo) */
  const injectChat = useCallback((user = 'viewer1', text = '!word test') => {
    onChat?.(user, text);
  }, [onChat]);

  /** Inject a fake gift (dev/demo) */
  const injectGift = useCallback((user = 'viewer1', coins = 100) => {
    onGift?.(user, coins);
  }, [onGift]);

  return { status, username, connect, disconnect, injectChat, injectGift };
}
