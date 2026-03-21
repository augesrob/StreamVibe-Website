/**
 * PlantsVsZombiesTool — TikTok Live Plants vs Zombies
 * Route: /tools/games/plants-vs-zombies
 *
 * TikTok gifts spawn zombies in the game:
 *   1–9 coins    → Normal zombie (🧟 fast, weak)
 *   10–99 coins  → Conehead zombie (🧟‍♂️ medium)
 *   100–999 coins → Buckethead zombie (🪣 tanky)
 *   1000+ coins  → ZOMBIE WAVE (5 mixed zombies)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useTikTokGameConnector } from '@/hooks/useTikTokGameConnector';
import GamePlanGate from '@/components/games/GamePlanGate';
import GAME_REGISTRY from '@/components/games/GameRegistry';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const GAME = GAME_REGISTRY.plants_vs_zombies;

// Gift coins → zombie type
function getZombieType(coins) {
  if (coins >= 1000) return { type: 'wave',       count: 5, label: '🌊 ZOMBIE WAVE',        color: '#ff1744' };
  if (coins >= 100)  return { type: 'buckethead',  count: 1, label: '🪣 Buckethead Zombie',   color: '#ff6d00' };
  if (coins >= 10)   return { type: 'conehead',    count: 1, label: '🧟‍♂️ Conehead Zombie',    color: '#ffd600' };
  return                    { type: 'normal',      count: 1, label: '🧟 Normal Zombie',        color: '#00e5ff' };
}

const GIFT_GUIDE = [
  { emoji:'🧟',  label:'Normal Zombie',     coins:'1–9',      desc:'Fast but weak',        color:'#00e5ff' },
  { emoji:'🧟‍♂️', label:'Conehead Zombie',   coins:'10–99',    desc:'More health',          color:'#ffd600' },
  { emoji:'🪣',  label:'Buckethead Zombie', coins:'100–999',  desc:'Very tanky',           color:'#ff6d00' },
  { emoji:'🌊',  label:'Zombie Wave x5',    coins:'1000+',    desc:'Massive attack!',      color:'#ff1744' },
];

export default function PlantsVsZombiesTool() {
  const { user } = useAuth();
  const iframeRef = useRef(null);
  const channelRef = useRef(null);
  const [overlayToken, setOverlayToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [connError, setConnError] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [gameState, setGameState] = useState({ score: 2000, zombieCount: 0, giftZombies: 0, zbDieNo: 0 });
  const [recentGifts, setRecentGifts] = useState([]);

  // Load overlay token
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data } = await supabase.from('profiles').select('overlay_token').eq('id', user.id).single();
      let token = data?.overlay_token;
      if (!token) {
        token = crypto.randomUUID();
        await supabase.from('profiles').update({ overlay_token: token }).eq('id', user.id);
      }
      setOverlayToken(token);
      const ch = supabase.channel(`pvz:${user.id}`);
      channelRef.current = ch;
      ch.subscribe();
    };
    init();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user]);

  // Listen for state updates from iframe
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'pvz_state') {
        setGameState(e.data);
        // Broadcast to overlay
        channelRef.current?.send({ type: 'broadcast', event: 'state', payload: e.data });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Send message to iframe
  const sendToGame = useCallback((msg) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*');
  }, []);

  // Handle TikTok gift → spawn zombie
  const handleGift = useCallback((username, coins) => {
    const { type, count, label, color } = getZombieType(coins);

    sendToGame({ type: 'pvz_gift', zombieType: type, username, count });

    setRecentGifts(prev => [{
      id: Date.now(), username, coins, label, color, ts: Date.now(),
    }, ...prev].slice(0, 20));

    // Broadcast to overlay
    channelRef.current?.send({
      type: 'broadcast', event: 'gift', payload: { username, coins, zombieType: type, label, color },
    });
  }, [sendToGame]);

  const tiktok = useTikTokGameConnector({
    onGift: handleGift,
    onChat: () => {},
    onError: (msg) => setConnError(msg),
  });

  // Notify iframe about connection state
  useEffect(() => {
    if (tiktok.status === 'connected' && tiktok.username) {
      sendToGame({ type: 'pvz_connected', username: tiktok.username });
    } else if (tiktok.status === 'disconnected') {
      sendToGame({ type: 'pvz_disconnected' });
    }
  }, [tiktok.status, tiktok.username, sendToGame]);

  const isWaitingLive = tiktok.status === 'connecting' && !!tiktok.username;
  const statusDot = {
    disconnected: 'bg-gray-600', connecting: 'bg-orange-500 animate-pulse',
    connected: 'bg-green-500 shadow-[0_0_8px_#00e676]', error: 'bg-red-500',
  }[tiktok.status] || 'bg-gray-600';

  const overlayUrl = overlayToken ? `${window.location.origin}/games-overlay/plants-vs-zombies?token=${overlayToken}` : null;

  const copyUrl = () => {
    if (!overlayUrl) return;
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GamePlanGate game={GAME}>
      <div className="flex flex-col h-[calc(100vh-64px)] mt-16 bg-[#0a0b14] text-white overflow-hidden">
        <Helmet><title>Plants vs Zombies LIVE — StreamVibe Games</title></Helmet>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1e2240] bg-[#0d0e1a] flex-shrink-0">
          <span className="text-2xl">🌻</span>
          <div>
            <h1 className="font-black text-lg text-white leading-tight">Plants vs Zombies LIVE</h1>
            <p className="text-gray-500 text-xs">Gifts spawn zombies · Score: {gameState.score} · Killed: {gameState.zbDieNo}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <div className="px-3 py-1 rounded-full text-xs font-black border bg-green-900/40 border-green-700 text-green-300">
              🧟 {gameState.zombieCount} on field
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-black border bg-purple-900/40 border-purple-700 text-purple-300">
              🎁 {gameState.giftZombies} spawned by gifts
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Left panel */}
          <div className="w-72 border-r border-[#1e2240] flex flex-col overflow-y-auto p-4 gap-4 flex-shrink-0">

            {/* Overlay URL */}
            <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
              <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">🖥 Overlay URL</p>
              <div className="flex gap-2">
                <button onClick={() => overlayUrl && window.open(overlayUrl, '_blank')} disabled={!overlayUrl}
                  className="flex-1 py-1.5 rounded-lg border border-[#1e2240] bg-[#0a0b14] text-cyan-400 hover:border-cyan-600 font-mono text-xs font-bold disabled:opacity-40">
                  🖥 Preview
                </button>
                <button onClick={copyUrl} disabled={!overlayUrl}
                  className="flex-1 py-1.5 rounded-lg border border-[#1e2240] bg-[#0a0b14] text-gray-400 font-mono text-xs font-bold disabled:opacity-40">
                  {copied ? '✓' : '📋'}
                </button>
              </div>
              <p className="text-[9px] text-gray-700 mt-1.5">
                Browser Source · <span className="text-cyan-800">1080×1920px (9:16)</span> · TikTok recommended
              </p>
            </div>

            {/* TikTok Connect */}
            <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
              <button onClick={() => {
                if (tiktok.status === 'connected' || isWaitingLive) tiktok.disconnect();
                else if (usernameInput.trim()) tiktok.connect(usernameInput.trim());
              }} className={`w-full py-2.5 rounded-lg font-mono font-black text-xs tracking-widest flex items-center justify-center gap-2 transition-all
                ${tiktok.status === 'connected' ? 'bg-gray-700 text-gray-400'
                  : isWaitingLive ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-800'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black'}`}>
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot}`}/>
                {tiktok.status === 'connected' ? `@${tiktok.username} — Disconnect`
                  : isWaitingLive ? `⏳ Waiting for @${tiktok.username}... Cancel`
                  : tiktok.status === 'connecting' ? 'CONNECTING…' : '♪ CONNECT MY LIVE'}
              </button>
              {isWaitingLive && <p className="text-[10px] text-yellow-600 text-center mt-2">Auto-connects when you go live</p>}
              {(tiktok.status === 'disconnected' || tiktok.status === 'error') && (
                <input value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && usernameInput.trim() && tiktok.connect(usernameInput.trim())}
                  placeholder="@yourtiktokusername"
                  className="mt-2 w-full bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-1.5 text-white placeholder:text-gray-600 font-semibold focus:border-cyan-500 outline-none text-sm"/>
              )}
              {connError && <p className="text-[10px] text-red-500 mt-1 text-center">{connError}</p>}
            </div>

            {/* Gift guide */}
            <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
              <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">🎁 Gift → Zombie</p>
              {GIFT_GUIDE.map(g => (
                <div key={g.type} className="flex items-center gap-2 mb-2 last:mb-0">
                  <span className="text-lg w-7">{g.emoji}</span>
                  <div className="flex-1">
                    <div className="text-xs font-bold" style={{ color: g.color }}>{g.label}</div>
                    <div className="text-[10px] text-gray-600">{g.desc}</div>
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 text-right">{g.coins}🪙</div>
                </div>
              ))}
            </div>

            {/* Dev test buttons */}
            {import.meta.env.DEV && (
              <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
                <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">🧪 Test Spawn</p>
                {GIFT_GUIDE.map(g => (
                  <button key={g.type} onClick={() => handleGift('testviewer', g.coins === '1000+' ? 1000 : parseInt(g.coins))}
                    className="w-full text-xs border border-gray-800 rounded py-1 mb-1 text-gray-500 hover:text-gray-300 text-left px-2">
                    {g.emoji} {g.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Game iframe (center) */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <iframe
              ref={iframeRef}
              src="/games/pvz/index.html"
              className="flex-1 w-full border-0"
              title="Plants vs Zombies"
              style={{ minHeight: 0 }}
            />
          </div>

          {/* Right — recent gifts */}
          <div className="w-64 border-l border-[#1e2240] flex flex-col p-4 overflow-y-auto flex-shrink-0">
            <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3">🎁 Recent Gifts</p>
            {recentGifts.length === 0 ? (
              <div className="text-center text-gray-700 text-xs mt-4">
                <p className="text-2xl mb-2">🧟</p>
                <p>Waiting for gifts...</p>
                <p className="mt-1 text-gray-800">Viewers send gifts to spawn zombies!</p>
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
      </div>
    </GamePlanGate>
  );
}
