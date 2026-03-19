import React, { useState } from 'react';
import { BOOST_TIERS } from '@/hooks/useCannonEngine';

const PROJ_INFO = {
  standard:  { emoji: '🔴', label: 'Standard',  desc: 'High mass, high knockback' },
  bouncy:    { emoji: '🟣', label: 'Bouncy',    desc: 'Stays active, multi-bounce' },
  explosive: { emoji: '💥', label: 'Explosive', desc: 'AOE blast radius on impact' },
};

export default function CannonControls({ engine, tiktok, connError, onClearError, overlayUrl }) {
  const { phase, boostQueue, cannons, leaderboard, manualFire, reset } = engine;
  const { status, connect, disconnect, username: connUser } = tiktok;
  const [usernameInput, setUsernameInput] = useState('');
  const [copied, setCopied] = useState(false);

  const isActive = phase === 'climbing' || phase === 'aiming' || phase === 'ragdoll';

  const statusDot = {
    disconnected: 'bg-gray-600', connecting: 'bg-orange-500 animate-pulse',
    connected: 'bg-green-500 shadow-[0_0_8px_#00e676]', error: 'bg-red-500',
  }[status] ?? 'bg-gray-600';

  const handleConnect = () => {
    if (status === 'connected') { disconnect(); return; }
    if (!usernameInput.trim()) return;
    connect(usernameInput.trim());
  };

  const phaseLabel = { idle:'⏳ IDLE', aiming:'🎯 AIMING', climbing:'🔺 CLIMBING', ragdoll:'😵 RAGDOLL', landed:'🏁 LANDED' }[phase] ?? phase;
  const phaseColor = { climbing:'text-green-400', ragdoll:'text-red-400', aiming:'text-orange-400', landed:'text-yellow-400' }[phase] ?? 'text-gray-400';

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">

      {/* Overlay URL */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
        <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">🖥 Overlay</p>
        <div className="flex gap-2">
          <button onClick={() => overlayUrl && window.open(overlayUrl, '_blank')} disabled={!overlayUrl}
            className="flex-1 py-1.5 rounded-lg border border-[#1e2240] bg-[#0a0b14] text-cyan-400 hover:border-cyan-600 font-mono text-xs font-bold disabled:opacity-40 transition-all">
            🖥 Preview
          </button>
          <button onClick={() => { navigator.clipboard.writeText(overlayUrl); setCopied(true); setTimeout(()=>setCopied(false),2000); }} disabled={!overlayUrl}
            className="flex-1 py-1.5 rounded-lg border border-[#1e2240] bg-[#0a0b14] text-gray-400 font-mono text-xs font-bold disabled:opacity-40 transition-all">
            {copied ? '✓' : '📋'}
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3 text-center">
        <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Status</div>
        <div className={`font-black text-sm ${phaseColor}`}>{phaseLabel}</div>
      </div>

      {/* TikTok */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
        <button onClick={handleConnect}
          className={`w-full py-2.5 rounded-lg font-mono font-black text-xs tracking-widest flex items-center justify-center gap-2 transition-all
            ${status === 'connected' ? 'bg-gray-700 text-gray-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black'}`}>
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot}`} />
          {status === 'connected' ? `@${connUser} — Disconnect` : status === 'connecting' ? 'CONNECTING…' : '♪ CONNECT MY LIVE'}
        </button>
        {status !== 'connected' && (
          <input value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
            placeholder="@yourtiktokusername"
            className="mt-2 w-full bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-1.5 text-white placeholder:text-gray-600 font-semibold focus:border-cyan-500 outline-none text-sm" />
        )}
      </div>

      {/* Fire / Reset */}
      <div className="space-y-2">
        <button onClick={manualFire} disabled={isActive}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 disabled:opacity-30 text-white font-mono font-black text-sm tracking-widest transition-all">
          💥 LAUNCH!
        </button>
        <button onClick={reset}
          className="w-full py-2 rounded-xl bg-[#0a0b14] border border-[#1e2240] text-gray-400 font-mono font-black text-xs tracking-widest transition-all">
          ↺ RESET
        </button>
      </div>

      {/* Boost queue */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
        <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-2">⚡ Boosts ({boostQueue.length})</div>
        {boostQueue.length === 0
          ? <p className="text-gray-700 text-xs text-center">Gifts boost climb speed!</p>
          : boostQueue.map((b, i) => (
              <div key={i} className="flex items-center gap-2 bg-[#0a0b14] rounded px-2 py-1 mb-1 border border-[#1e2240]">
                <span>{b.emoji}</span>
                <span className="text-xs font-bold flex-1" style={{ color: b.color }}>{b.label}</span>
                <span className="text-gray-600 text-[10px]">@{b.user}</span>
              </div>
            ))
        }
      </div>

      {/* Gift guide */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
        <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-2">🎁 Gift = Speed Boost</div>
        {Object.entries(BOOST_TIERS).map(([id, t]) => (
          <div key={id} className="flex items-center gap-2 text-xs mb-1">
            <span>{t.emoji}</span>
            <span className="flex-1 font-bold" style={{ color: t.color }}>{t.label}</span>
            <span className="text-gray-600">{t.coins[0]}–{t.coins[1]===Infinity?'∞':t.coins[1]}🪙</span>
          </div>
        ))}
        <p className="text-[9px] text-gray-700 mt-1 text-center">Gifts during climb = instant boost!</p>
      </div>

      {/* Projectile types */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
        <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-2">💣 Projectile Types</div>
        {Object.entries(PROJ_INFO).map(([id, p]) => (
          <div key={id} className="flex items-center gap-2 text-xs mb-1">
            <span>{p.emoji}</span>
            <div>
              <div className="font-bold text-gray-300">{p.label}</div>
              <div className="text-gray-600 text-[9px]">{p.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Dev inject */}
      {import.meta.env.DEV && (
        <div className="space-y-1">
          {Object.entries(BOOST_TIERS).map(([id, t]) => (
            <button key={id} onClick={() => engine.processGift(`v${Math.floor(Math.random()*99)}`, t.coins[0])}
              className="w-full text-xs border border-gray-800 rounded py-1 text-gray-600 hover:text-gray-400">
              🧪 {t.emoji} {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
