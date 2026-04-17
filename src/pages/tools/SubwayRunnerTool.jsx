/**
 * SubwayRunnerTool — Real Subway Surfers WebGL game with TikTok Live gift integration
 * Route: /tools/games/subway-runner
 *
 * TikTok gifts → in-game power-ups:
 *   Rose (1 coin)        → Spawn coins
 *   Galaxy (100 coins)   → Jetpack 🚀
 *   Lion (500 coins)     → Clear track 💥
 *   Drama Queen (200)    → +1 Life ♥
 *   Bouquet (50 coins)   → Coin Magnet 🧲
 *   Diamond (999 coins)  → ×2 Score ✕2
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useTikTokGameConnector } from '@/hooks/useTikTokGameConnector';
import GamePlanGate from '@/components/games/GamePlanGate';
import GAME_REGISTRY from '@/components/games/GameRegistry';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const GAME = GAME_REGISTRY.subway_runner;

const DEFAULT_GIFTS = [
  { id: 'rose',        name: 'Rose',        emoji: '🌹', coins: 1,   event: 'spawn_coins',  color: '#ff4d6d' },
  { id: 'galaxy',      name: 'Galaxy',      emoji: '🌌', coins: 100, event: 'jetpack',       color: '#ff9f43' },
  { id: 'lion',        name: 'Lion',        emoji: '🦁', coins: 500, event: 'clear_track',   color: '#fdcb6e' },
  { id: 'drama_queen', name: 'Drama Queen', emoji: '👑', coins: 200, event: 'add_life',      color: '#fd79a8' },
  { id: 'bouquet',     name: 'Bouquet',     emoji: '💐', coins: 50,  event: 'magnet',        color: '#74b9ff' },
  { id: 'diamond',     name: 'Diamond',     emoji: '💎', coins: 999, event: 'x2_score',     color: '#a29bfe' },
];

const EVT_LABELS = {
  spawn_coins: 'Spawn Coins 🪙', jetpack: 'Jetpack 🚀', clear_track: 'Clear Track 💥',
  add_life: '+1 Life ♥', magnet: 'Coin Magnet 🧲', x2_score: '×2 Score ✕2',
  sneakers: 'Super Sneakers 👟', hoverboard: 'Hoverboard 🛹',
};

const GIFT_EVENT_OPTIONS = [
  { val: 'spawn_coins', label: 'Spawn Coins 🪙' },
  { val: 'jetpack',     label: 'Jetpack 🚀' },
  { val: 'magnet',      label: 'Coin Magnet 🧲' },
  { val: 'sneakers',    label: 'Super Sneakers 👟' },
  { val: 'hoverboard',  label: 'Hoverboard 🛹' },
  { val: 'x2_score',    label: '×2 Score ✕2' },
  { val: 'add_life',    label: '+1 Life ♥' },
  { val: 'clear_track', label: 'Clear Track 💥' },
];

function getGiftEvent(coins, giftMappings) {
  // Find matching gift by coin value (closest match ≤ coins)
  const sorted = [...giftMappings].sort((a, b) => b.coins - a.coins);
  const match = sorted.find(g => coins >= g.coins);
  return match ? match.event : 'spawn_coins';
}

export default function SubwayRunnerTool() {
  const { user } = useAuth();
  const iframeRef = useRef(null);
  const [gifts, setGifts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sv_runner_gifts') || 'null') || DEFAULT_GIFTS; }
    catch { return DEFAULT_GIFTS; }
  });
  const [recentGifts, setRecentGifts] = useState([]);
  const [connError, setConnError] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [editGift, setEditGift] = useState(null);
  const [copied, setCopied] = useState(false);

  const saveGifts = (newGifts) => {
    setGifts(newGifts);
    localStorage.setItem('sv_runner_gifts', JSON.stringify(newGifts));
  };

  // Send event into the game iframe — try postMessage then direct frame call
  const fireEvent = useCallback((event) => {
    const frame = iframeRef.current;
    if (!frame) return;
    // Primary: postMessage (works cross-origin)
    try { frame.contentWindow?.postMessage({ type: 'sv_gift', event }, '*'); } catch(e) {}
    // Fallback: direct call if same-origin
    try { frame.contentWindow?.svGift?.(event); } catch(e) {}
  }, []);

  // Handle incoming TikTok gift
  const handleGift = useCallback((username, coins, giftName) => {
    const event = getGiftEvent(coins, gifts);
    fireEvent(event);
    setRecentGifts(prev => [{
      id: Date.now(), username, coins, giftName,
      event, label: EVT_LABELS[event] || event,
      color: gifts.find(g => g.event === event)?.color || '#a78bfa',
    }, ...prev].slice(0, 30));
  }, [gifts, fireEvent]);

  const tiktok = useTikTokGameConnector({
    onGift: handleGift,
    onChat: () => {},
    onError: (msg) => setConnError(msg),
  });

  const statusDot = {
    disconnected: 'bg-gray-600', connecting: 'bg-orange-500 animate-pulse',
    connected: 'bg-green-500 shadow-[0_0_8px_#00e676]', error: 'bg-red-500',
  }[tiktok.status] || 'bg-gray-600';

  const isWaitingLive = tiktok.status === 'connecting' && !!tiktok.username;

  return (
    <GamePlanGate game={GAME}>
      <div className="flex flex-col h-[calc(100vh-64px)] mt-16 bg-[#0a0b14] text-white overflow-hidden">
        <Helmet><title>Subway Runner — StreamVibe Games</title></Helmet>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1e2240] bg-[#0d0e1a] flex-shrink-0">
          <span className="text-2xl">🏃</span>
          <div>
            <h1 className="font-black text-lg text-white leading-tight">Subway Runner LIVE</h1>
            <p className="text-gray-500 text-xs">TikTok gifts trigger power-ups in real time</p>
          </div>
          <div className="ml-auto flex gap-2">
            <div className="px-3 py-1 rounded-full text-xs font-black border bg-purple-900/40 border-purple-700 text-purple-300">
              🎁 {recentGifts.length} gifts this session
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Left panel */}
          <div className="w-72 border-r border-[#1e2240] flex flex-col overflow-y-auto p-4 gap-4 flex-shrink-0">

            {/* TikTok Connect */}
            <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
              <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">📱 TikTok Live</p>
              <button
                onClick={() => {
                  if (tiktok.status === 'connected' || isWaitingLive) tiktok.disconnect();
                  else if (usernameInput.trim()) tiktok.connect(usernameInput.trim());
                }}
                className={`w-full py-2.5 rounded-lg font-mono font-black text-xs tracking-widest flex items-center justify-center gap-2 transition-all
                  ${tiktok.status === 'connected' ? 'bg-gray-700 text-gray-400'
                    : isWaitingLive ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-800'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-black'}`}>
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot}`} />
                {tiktok.status === 'connected' ? `@${tiktok.username} — Disconnect`
                  : isWaitingLive ? `⏳ Waiting for @${tiktok.username}... Cancel`
                  : tiktok.status === 'connecting' ? 'CONNECTING…' : '♪ CONNECT MY LIVE'}
              </button>
              {isWaitingLive && <p className="text-[10px] text-yellow-600 text-center mt-2">Auto-connects when you go live</p>}
              {(tiktok.status === 'disconnected' || tiktok.status === 'error') && (
                <input
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && usernameInput.trim() && tiktok.connect(usernameInput.trim())}
                  placeholder="@yourtiktokusername"
                  className="mt-2 w-full bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-1.5 text-white placeholder:text-gray-600 font-semibold focus:border-purple-500 outline-none text-sm"
                />
              )}
              {connError && <p className="text-[10px] text-red-500 mt-1 text-center">{connError}</p>}
            </div>

            {/* Gift → Power-up config */}
            <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">🎁 Gift Events</p>
                <button
                  onClick={() => setEditGift({ id: 'new_' + Date.now(), name: 'Gift', emoji: '🎁', coins: 10, event: 'spawn_coins', color: '#a29bfe' })}
                  className="text-[10px] text-purple-500 hover:text-purple-300 font-bold">
                  + Add
                </button>
              </div>
              {gifts.map(g => (
                <div key={g.id} className="flex items-center gap-2 mb-2 last:mb-0 group">
                  <span className="text-base w-6">{g.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: g.color }}>{g.name}</div>
                    <div className="text-[10px] text-gray-600 truncate">{EVT_LABELS[g.event] || g.event}</div>
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono">{g.coins}🪙</span>
                  <button onClick={() => setEditGift({ ...g })} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-purple-400 text-[10px] transition-opacity">✏️</button>
                  <button onClick={() => saveGifts(gifts.filter(x => x.id !== g.id))} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-[10px] transition-opacity">✕</button>
                </div>
              ))}
            </div>

            {/* Test buttons (always visible for easy testing) */}
            <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
              <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">🧪 Test Power-ups</p>
              <div className="grid grid-cols-2 gap-1.5">
                {gifts.map(g => (
                  <button key={g.id} onClick={() => fireEvent(g.event)}
                    style={{ borderColor: g.color + '44', color: g.color }}
                    className="text-[10px] font-bold border rounded-lg py-1.5 px-2 bg-transparent hover:bg-white/5 transition-colors text-left">
                    {g.emoji} {g.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Game iframe */}
          <div className="flex-1 overflow-hidden flex flex-col bg-black">
            <iframe
              ref={iframeRef}
              src="/games/subway-runner/index.html"
              className="flex-1 w-full border-0"
              title="Subway Runner"
              style={{ minHeight: 0 }}
              allow="autoplay"
            />
          </div>

          {/* Right — recent gifts */}
          <div className="w-64 border-l border-[#1e2240] flex flex-col p-4 overflow-y-auto flex-shrink-0">
            <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3">🎁 Recent Gifts</p>
            {recentGifts.length === 0 ? (
              <div className="text-center text-gray-700 text-xs mt-6">
                <p className="text-3xl mb-2">🏃</p>
                <p>Waiting for gifts...</p>
                <p className="mt-1 text-gray-800">Viewers send gifts to trigger power-ups!</p>
              </div>
            ) : recentGifts.map(g => (
              <div key={g.id} className="flex items-center gap-2 bg-[#151828] rounded-lg px-3 py-2 mb-2 border border-[#1e2240]">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">@{g.username}</div>
                  <div className="text-[10px] font-bold truncate" style={{ color: g.color }}>{g.label}</div>
                </div>
                <div className="text-[10px] text-gray-500 font-mono flex-shrink-0">{g.coins}🪙</div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Gift Modal */}
        {editGift && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={e => e.target === e.currentTarget && setEditGift(null)}>
            <div className="bg-[#0d0e1a] border border-[#2e1065] rounded-xl p-5 w-72 flex flex-col gap-3">
              <div className="font-bold text-sm text-white">{editGift.id.startsWith('new_') ? 'New Gift' : 'Edit Gift'}</div>
              <div>
                <div className="text-[10px] text-gray-500 mb-1">Gift Name</div>
                <input className="w-full bg-[#08050f] border border-[#2e1065] rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-purple-500"
                  value={editGift.name} onChange={e => setEditGift(g => ({ ...g, name: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <div className="flex-none w-20">
                  <div className="text-[10px] text-gray-500 mb-1">Emoji</div>
                  <input className="w-full bg-[#08050f] border border-[#2e1065] rounded-lg px-2 py-1.5 text-white text-xs outline-none"
                    value={editGift.emoji} onChange={e => setEditGift(g => ({ ...g, emoji: e.target.value }))} />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-gray-500 mb-1">TikTok Coins</div>
                  <input type="number" className="w-full bg-[#08050f] border border-[#2e1065] rounded-lg px-2 py-1.5 text-white text-xs outline-none"
                    value={editGift.coins} onChange={e => setEditGift(g => ({ ...g, coins: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-1">Game Event</div>
                <select className="w-full bg-[#08050f] border border-[#2e1065] rounded-lg px-2 py-1.5 text-white text-xs outline-none"
                  value={editGift.event} onChange={e => setEditGift(g => ({ ...g, event: e.target.value }))}>
                  {GIFT_EVENT_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-1">Accent Color</div>
                <input type="color" className="w-full h-8 bg-[#08050f] border border-[#2e1065] rounded-lg p-0.5 cursor-pointer"
                  value={editGift.color} onChange={e => setEditGift(g => ({ ...g, color: e.target.value }))} />
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={() => {
                  const idx = gifts.findIndex(x => x.id === editGift.id);
                  const next = idx >= 0 ? gifts.map(x => x.id === editGift.id ? editGift : x) : [...gifts, editGift];
                  saveGifts(next); setEditGift(null);
                }} className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs py-2 rounded-lg">Save</button>
                <button onClick={() => setEditGift(null)} className="flex-1 bg-[#1a1a2e] text-gray-400 hover:text-white text-xs py-2 rounded-lg border border-[#2e1065]">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GamePlanGate>
  );
}
