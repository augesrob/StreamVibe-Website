/**
 * useTikTokGameConnector
 * Extended TikTok connector that fires BOTH gift and chat events.
 * Drop-in replacement for useTikTokConnector when a game needs chat.
 *
 * Connection flow:
 *   1. Fetch relay /roomid → get wsUrl
 *   2. Open WebSocket → live gifts + chat
 *   3. Fallback: relay unreachable → silent "connected" (demo mode, no error banner)
 *      Real errors (bad username, WS failure) still surface via onError.
 */
import { useState, useRef, useCallback } from 'react';

const RELAY_URL = 'https://raykfnoptzzsdcvjupzf.supabase.co/functions/v1/tiktok-relay';
const RELAY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheWtmbm9wdHp6c2Rjdmp1cHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDkwMjcsImV4cCI6MjA4NTI4NTAyN30.hAAb2OLsdq4zPYQnKzzVYIVlDcGthhoIvIRMO-cUlvo';

export function useTikTokGameConnector({ onGift, onChat, onError }) {
  const [status,   setStatus]   = useState('disconnected');
  const [username, setUsername] = useState('');
  const [isDemo,   setIsDemo]   = useState(false); // true when relay unreachable
  const wsRef  = useRef(null);
  const alive  = useRef(false);

  const disconnect = useCallback(() => {
    alive.current = false;
    if (wsRef.current) { try { wsRef.current.close(); } catch (_) {} wsRef.current = null; }
    setStatus('disconnected');
    setIsDemo(false);
  }, []);

  const connect = useCallback(async (user) => {
    disconnect();
    const clean = user.replace('@', '').trim();
    if (!clean) return;
    setUsername(clean);
    setStatus('connecting');
    setIsDemo(false);
    alive.current = true;

    try {
      const res = await fetch(`${RELAY_URL}/roomid?username=${encodeURIComponent(clean)}`, {
        headers: { Authorization: `Bearer ${RELAY_KEY}` },
      });
      if (!alive.current) return;

      // Relay not deployed or returned error → silent demo mode (same as useTikTokConnector)
      if (!res.ok) {
        console.warn('TikTok relay returned', res.status, '— running in demo mode');
        setStatus('connected');
        setIsDemo(true);
        return;
      }

      const data = await res.json();
      if (!alive.current) return;

      const wsUrl = data.wsUrl ?? data.ws_url ?? data.url;
      if (!wsUrl) {
        // Relay responded but gave no WS URL — demo mode
        console.warn('TikTok relay gave no wsUrl — running in demo mode');
        setStatus('connected');
        setIsDemo(true);
        return;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen  = () => { if (alive.current) { setStatus('connected'); setIsDemo(false); } };
      ws.onclose = () => { if (alive.current) setStatus('disconnected'); };
      ws.onerror = () => {
        if (!alive.current) return;
        setStatus('error');
        onError?.('WebSocket error — check your TikTok username and try again.');
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
      // Network error / CORS / relay unreachable → silent demo mode
      // Do NOT call onError here — this is expected when relay isn't deployed
      // and matches how useTikTokConnector handles this case.
      console.warn('TikTok relay unreachable, running in demo mode:', err.message);
      setStatus('connected');
      setIsDemo(true);
    }
  }, [disconnect, onError]);

  function handleGift(data) {
    try {
      const giftType  = data.giftDetails?.giftType ?? data.giftType ?? 0;
      const repeatEnd = data.repeatEnd ?? 1;
      if (giftType === 1 && repeatEnd === 0) return; // mid-streak
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

  return { status, username, isDemo, connect, disconnect, injectChat, injectGift };
}
