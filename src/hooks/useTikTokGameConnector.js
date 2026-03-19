/**
 * useTikTokGameConnector — gifts + chat (Live Words, Cannon Blast)
 *
 * Connects via WebSocket to the StreamVibe Bridge (Railway):
 *   wss://streamvibe-bridge-production.up.railway.app
 *
 * Protocol:
 *   → { type:"connect_tiktok", username }
 *   ← { type:"bridge_connected" }
 *   ← { type:"tiktok_connected" }   → status = 'connected'
 *   ← { type:"not_live" }           → bridge auto-retries every 30s, status = 'connecting'
 *   ← { type:"error", message }     → internal bridge error (suppressed unless fatal)
 *   ← { type:"gift", ... }
 *   ← { type:"comment", ... }
 */
import { useState, useRef, useCallback } from 'react';

const BRIDGE_URL = 'wss://streamvibe-bridge-production.up.railway.app';

// Coerce anything to a display string safely
function toStr(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val.message && typeof val.message === 'string') return val.message;
  try { return JSON.stringify(val); } catch (_) { return String(val); }
}

export function useTikTokGameConnector({ onGift, onChat, onError }) {
  const [status,   setStatus]   = useState('disconnected');
  const [username, setUsername] = useState('');
  const [isDemo,   setIsDemo]   = useState(false);
  const wsRef  = useRef(null);
  const alive  = useRef(false);

  const disconnect = useCallback(() => {
    alive.current = false;
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'disconnect_tiktok' }));
        wsRef.current.close();
      } catch (_) {}
      wsRef.current = null;
    }
    setStatus('disconnected');
    setIsDemo(false);
  }, []);

  const connect = useCallback((user) => {
    disconnect();
    const clean = user.replace('@', '').trim().toLowerCase();
    if (!clean) return;
    setUsername(clean);
    setStatus('connecting');
    setIsDemo(false);
    alive.current = true;

    try {
      const ws = new WebSocket(BRIDGE_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!alive.current) { ws.close(); return; }
        ws.send(JSON.stringify({ type: 'connect_tiktok', username: clean }));
      };

      ws.onclose = () => {
        if (!alive.current) return;
        setStatus('disconnected');
      };

      ws.onerror = () => {
        if (!alive.current) return;
        setStatus('error');
        onError?.('Could not reach the StreamVibe Bridge. Check your connection.');
      };

      ws.onmessage = (e) => {
        if (!alive.current) return;
        try {
          const msg = JSON.parse(e.data);
          switch (msg.type) {
            case 'bridge_connected':
              // Connected to bridge, waiting for TikTok
              break;

            case 'tiktok_connected':
              setStatus('connected');
              setIsDemo(false);
              break;

            case 'not_live':
              // User isn't live yet — bridge auto-retries every 30s
              // Stay in 'connecting' state, no error shown
              setStatus('connecting');
              break;

            case 'tiktok_disconnected':
              // Stream ended or user requested — go back to connecting (bridge retries)
              if (msg.reason !== 'user_requested') setStatus('connecting');
              break;

            case 'error': {
              // Internal bridge/TikTok error. These are often noisy connector errors
              // (e.g. rate limits, transient failures) not meaningful to the user.
              // Only surface if we're in a stable connected state, otherwise swallow.
              const raw = toStr(msg.message);
              console.warn('Bridge error event:', raw);
              // Don't call onError — bridge handles its own retry logic.
              // The user sees the yellow "waiting for live" indicator instead.
              break;
            }

            case 'gift':
              handleGift(msg);
              break;

            case 'comment':
              handleChat(msg);
              break;
          }
        } catch (_) {}
      };

    } catch (err) {
      if (!alive.current) return;
      setStatus('error');
      onError?.('Could not connect to StreamVibe Bridge.');
    }
  }, [disconnect, onError]);

  function handleGift(data) {
    try {
      // Bridge sends: { username, giftName, coins, repeatCount, repeatEnd }
      // Only fire on completed streaks (repeatEnd=true) or non-streakable gifts
      const repeatEnd = data.repeatEnd ?? true;
      const isStreak  = data.coins > 0 && !repeatEnd;
      if (isStreak) return;

      const coins = (data.coins ?? 0) * Math.max(1, data.repeatCount ?? 1);
      const user  = data.username ?? 'unknown';
      if (coins > 0 && user !== 'unknown') onGift?.(user, coins);
    } catch (_) {}
  }

  function handleChat(data) {
    try {
      const user    = data.username ?? 'unknown';
      const comment = data.message  ?? '';
      if (user !== 'unknown' && comment) onChat?.(user, comment.trim());
    } catch (_) {}
  }

  const injectChat = useCallback((user = 'viewer1', text = '!word test') => {
    onChat?.(user, text);
  }, [onChat]);

  const injectGift = useCallback((user = 'viewer1', coins = 100) => {
    onGift?.(user, coins);
  }, [onGift]);

  return { status, username, isDemo, connect, disconnect, injectChat, injectGift };
}
