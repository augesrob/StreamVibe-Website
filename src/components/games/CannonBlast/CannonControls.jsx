/**
 * CannonControls — Left panel: angle, launch, boost queue, TikTok connect
 */
import React, { useState } from 'react';
import { BOOST_TIERS } from '@/hooks/useCannonEngine';

export default function CannonControls({ engine, tiktok, connError, onClearError, overlayUrl }) {
  const { phase, angle, activePowerMultiplier, boostQueue, setAngle, manualFire, reset } = engine;
  const { status, connect, disconnect, injectGift, username: connUser } = tiktok;
  const [usernameInput, setUsernameInput] = useState('');
  const [copied, setCopied] = useState(false);

  const isLaunched = phase === 'launched';

  const statusDot = {
    disconnected: 'bg-gray-600', connecting: 'bg-orange-500 animate-pulse',
    connected: 'bg-green-500 shadow-[0_0_8px_#00e676]', error: 'bg-red-500',
  }[status] || 'bg-gray-600';

  const handleConnect = () => {
    if (status === 'connected') { disconnect(); return; }
    if (!usernameInput.trim()) return;
    connect(usernameInput.trim());
  };

  const copyUrl = () => {
    if (!overlayUrl) return;
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">

      {/* Overlay URL */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
        <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">🖥 Overlay URL</p>
        <div className="flex gap-2">
          <button onClick={() => overlayUrl && window.open(overlayUrl, '_blank')} disabled={!overlayUrl}
            className="flex-1 py-1.5 rounded-lg border border-[#1e2240] bg-[#0a0b14] text-cyan-400 hover:border-cyan-600 font-mono text-xs font-bold disabled:opacity-40 transition-all">
            🖥 Preview
          </button>
          <button onClick={copyUrl} disabled={!overlayUrl}
            className="flex-1 py-1.5 rounded-lg border border-[#1e2240] bg-[#0a0b14] text-gray-400 hover:border-gray-500 font-mono text-xs font-bold disabled:opacity-40 transition-all">
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Angle control */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">
          🎯 Launch Angle: <span className="text-cyan-400">{angle}°</span>
        </div>
        <input type="range" min={10} max={80} value={angle}
          onChange={e => setAngle(Number(e.target.value))}
          className="w-full accent-cyan-500" />
        <div className="flex justify-between text-[10px] text-gray-700 mt-0.5"><span>10°</span><span>80°</span></div>
      </div>

      {/* TikTok Connect */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <button onClick={handleConnect}
          className={`w-full py-3 rounded-lg font-mono font-black text-sm tracking-widest flex items-center justify-center gap-2 transition-all
            ${status === 'connected' ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-black shadow-lg shadow-cyan-500/20'}`}>
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot}`} />
          {status === 'connected' ? `CONNECTED (@${connUser}) — Disconnect` : status === 'connecting' ? 'CONNECTING…' : '♪  CONNECT MY LIVE'}
        </button>
        {status !== 'connected' && (
          <input value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
            placeholder="@yourtiktokusername"
            className="mt-3 w-full bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-2 text-white placeholder:text-gray-600 font-semibold focus:border-cyan-500 outline-none text-sm" />
        )}
      </div>

      {/* Launch / Reset buttons */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4 space-y-3">
        <button onClick={() => manualFire()} disabled={isLaunched}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono font-black text-sm tracking-widest hover:from-orange-400 hover:to-red-500 transition-all">
          💥 FIRE!
        </button>
        <button onClick={reset}
          className="w-full py-2.5 rounded-xl bg-[#0a0b14] border border-[#1e2240] text-gray-400 hover:border-gray-500 font-mono font-black text-xs tracking-widest transition-all">
          ↺ RESET
        </button>
      </div>

      {/* Boost queue */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3">
          ⚡ Boost Queue ({boostQueue.length})
        </div>
        {boostQueue.length === 0 ? (
          <p className="text-gray-700 text-xs text-center py-2">Waiting for gifts from viewers…</p>
        ) : (
          <div className="space-y-1.5">
            {boostQueue.map((b, i) => (
              <div key={i} className="flex items-center gap-2 bg-[#0a0b14] rounded-lg px-3 py-1.5 border border-[#1e2240]">
                <span className="text-base">{b.emoji}</span>
                <span className="text-xs font-bold" style={{ color: b.color }}>{b.label}</span>
                <span className="text-gray-600 text-[10px] ml-auto">@{b.user}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gift → Boost guide */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-3">🎁 Gift Boosts</div>
        <div className="space-y-1.5">
          {Object.entries(BOOST_TIERS).map(([id, tier]) => (
            <div key={id} className="flex items-center gap-2 text-xs">
              <span>{tier.emoji}</span>
              <span className="font-bold flex-1" style={{ color: tier.color }}>{tier.label}</span>
              <span className="text-gray-600">{tier.coins[0]}-{tier.coins[1] === Infinity ? '∞' : tier.coins[1]} 🪙</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-700 mt-2 text-center">Gifts auto-fire the cannon!</p>
      </div>

      {/* Dev inject */}
      {import.meta.env.DEV && (
        <div className="space-y-1">
          {Object.entries(BOOST_TIERS).map(([id, tier]) => (
            <button key={id} onClick={() => engine.processGift(`viewer${Math.floor(Math.random()*99)}`, tier.coins[0])}
              className="w-full text-xs border border-gray-800 rounded py-1 text-gray-600 hover:text-gray-400 transition-colors">
              🧪 {tier.emoji} {tier.label} (dev)
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

