/**
 * useTikTokConnector — gifts-only (Auction tool)
 *
 * Connects via WebSocket to the StreamVibe Bridge (Railway):
 *   wss://streamvibe-bridge-production.up.railway.app
 *
 * Protocol:
 *   → { type:"connect_tiktok", username }
 *   ← { type:"bridge_connected" }
 *   ← { type:"tiktok_connected", username, roomId }
 *   ← { type:"tiktok_disconnected", reason }
 *   ← { type:"not_live", username, message }   (auto-retries every 30s server-side)
 *   ← { type:"gift", username, giftName, coins, repeatCount, repeatEnd }
 *   ← { type:"comment", username, message }
 *   ← { type:"follow"|"share"|"like"|"join"|"viewers"|"subscribe" }
 */
import { useState, useRef, useCallback } from 'react';

const BRIDGE_URL = 'wss://streamvibe-bridge-production.up.railway.app';

export function useTikTokConnector({ onGift, onError }) {
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
        onError?.('Bridge connection error — check your internet connection.');
      };

      ws.onmessage = (e) => {
        if (!alive.current) return;
        try {
          const msg = JSON.parse(e.data);
          switch (msg.type) {
            case 'bridge_connected':
              // Server acknowledged — waiting for TikTok connection
              break;
            case 'tiktok_connected':
              setStatus('connected');
              setIsDemo(false);
              break;
            case 'not_live':
              // User not live yet — bridge auto-retries every 30s, stay in connecting state
              setStatus('connecting');
              break;
            case 'tiktok_disconnected':
              if (msg.reason !== 'user_requested') setStatus('connecting');
              break;
            case 'gift':
              handleGift(msg);
              break;
            case 'error':
              onError?.(msg.message || 'TikTok error');
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
      // coins = diamondCount (already calculated on bridge side)
      const repeatEnd = data.repeatEnd ?? true;
      const isStreak  = data.coins > 0 && !repeatEnd; // mid-streak on streakable gifts
      // Only fire on completed gifts (repeatEnd=true) or non-streakable (repeatEnd always true)
      if (isStreak) return;

      const coins = (data.coins ?? 0) * Math.max(1, data.repeatCount ?? 1);
      const user  = data.username ?? 'unknown';
      if (coins > 0 && user !== 'unknown') onGift?.(user, coins);
    } catch (_) {}
  }

  /** Inject a test gift (dev/demo) */
  const injectTestBid = useCallback((user = 'testuser', coins = 100) => {
    onGift?.(user, coins);
  }, [onGift]);

  return { status, username, isDemo, connect, disconnect, injectTestBid };
}
