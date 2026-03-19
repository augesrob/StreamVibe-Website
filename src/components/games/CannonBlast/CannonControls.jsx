import React, { useState } from 'react';
import { GIFT_TIERS, CHEST_TYPES } from '@/hooks/useCannonEngine';

export default function CannonControls({ engine, tiktok, connError, onClearError, overlayUrl }) {
  const { phase, fuelsLeft, multipliers, boostQueue, leaderboard,
          startRound, refire, manualFire, reset, pickChest } = engine;
  const { status, connect, disconnect, username: connUser } = tiktok;
  const [usernameInput, setUsernameInput] = useState('');
  const [copied, setCopied] = useState(false);

  const canStart   = phase === 'idle' || phase === 'landed';
  const canRefire  = phase === 'landed' && fuelsLeft > 0;
  const isActive   = phase === 'charging' || phase === 'in_flight' || phase === 'rolling';

  const statusDot = {
    disconnected:'bg-gray-600', connecting:'bg-orange-500 animate-pulse',
    connected:'bg-green-500 shadow-[0_0_8px_#00e676]', error:'bg-red-500',
  }[status] ?? 'bg-gray-600';

  const phaseLabel = {
    idle:'⏳ IDLE', chest_pick:'🎁 PICK CHESTS',
    charging:'⚡ CHARGING', in_flight:'🚀 IN FLIGHT',
    rolling:'🏃 ROLLING!', landed:'🏁 LANDED',
  }[phase] ?? phase;
  const phaseColor = {
    charging:'text-orange-400', in_flight:'text-blue-400',
    rolling:'text-green-400', landed:'text-yellow-400', chest_pick:'text-purple-400',
  }[phase] ?? 'text-gray-400';

  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto h-full">

      {/* Overlay */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
        <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">🖥 Overlay</p>
        <div className="flex gap-2">
          <button onClick={() => overlayUrl && window.open(overlayUrl,'_blank')} disabled={!overlayUrl}
            className="flex-1 py-1.5 rounded-lg border border-[#1e2240] bg-[#0a0b14] text-cyan-400 hover:border-cyan-600 font-mono text-xs font-bold disabled:opacity-40">
            🖥 Preview
          </button>
          <button onClick={() => { navigator.clipboard.writeText(overlayUrl); setCopied(true); setTimeout(()=>setCopied(false),2000); }} disabled={!overlayUrl}
            className="flex-1 py-1.5 rounded-lg border border-[#1e2240] bg-[#0a0b14] text-gray-400 font-mono text-xs font-bold disabled:opacity-40">
            {copied ? '✓' : '📋'}
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3 text-center">
        <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Status</div>
        <div className={`font-black text-sm ${phaseColor}`}>{phaseLabel}</div>
      </div>

      {/* TikTok connect */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
        <button onClick={()=>{ if(status==='connected'){disconnect();}else if(usernameInput.trim()){connect(usernameInput.trim());}}}
          className={`w-full py-2.5 rounded-lg font-mono font-black text-xs tracking-widest flex items-center justify-center gap-2 transition-all
            ${status==='connected'?'bg-gray-700 text-gray-400':'bg-gradient-to-r from-cyan-500 to-blue-500 text-black'}`}>
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot}`}/>
          {status==='connected'?`@${connUser} — Disconnect`:status==='connecting'?'CONNECTING…':'♪ CONNECT MY LIVE'}
        </button>
        {status !== 'connected' && (
          <input value={usernameInput} onChange={e=>setUsernameInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&usernameInput.trim()&&connect(usernameInput.trim())}
            placeholder="@yourtiktokusername"
            className="mt-2 w-full bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-1.5 text-white placeholder:text-gray-600 font-semibold focus:border-cyan-500 outline-none text-sm"/>
        )}
        {connError && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
            <span>⚠ {connError}</span>
            <button onClick={onClearError} className="ml-auto text-gray-600 hover:text-gray-400">✕</button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        {canStart && (
          <button onClick={()=>startRound('host')}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-mono font-black text-sm tracking-widest transition-all hover:opacity-90">
            🎁 NEW ROUND
          </button>
        )}
        {canRefire && (
          <button onClick={()=>refire('host')}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-mono font-black text-sm tracking-widest transition-all hover:opacity-90">
            🔥 REFIRE ({fuelsLeft} left)
          </button>
        )}
        {phase === 'charging' && (
          <button onClick={manualFire}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-mono font-black text-sm tracking-widest">
            💥 FIRE NOW
          </button>
        )}
        <button onClick={reset}
          className="w-full py-2 rounded-xl bg-[#0a0b14] border border-[#1e2240] text-gray-500 font-mono font-black text-xs tracking-widest">
          ↺ RESET
        </button>
      </div>

      {/* Chest quick-pick (during chest_pick phase) */}
      {phase === 'chest_pick' && (
        <div className="bg-[#151828] border border-purple-900 rounded-xl p-3">
          <div className="text-[9px] font-bold tracking-widest text-purple-400 uppercase mb-2">🎁 QUICK PICK</div>
          {Object.entries(CHEST_TYPES).map(([type, def]) => (
            <button key={type} onClick={() => pickChest(type)}
              className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg mb-1 text-xs font-bold transition-all hover:opacity-80"
              style={{ background: def.color + '22', border: `1px solid ${def.color}55`, color: def.color }}>
              <span className="text-base">{def.emoji}</span>
              <span>{def.label}</span>
              <span className="ml-auto text-[10px] opacity-60">{def.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Gift tier guide */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
        <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-2">🎁 Gift Effects</div>
        {Object.entries(GIFT_TIERS).map(([id, t]) => (
          <div key={id} className="flex items-center gap-2 text-xs mb-1">
            <span>{t.emoji}</span>
            <div className="flex-1">
              <span className="font-bold" style={{color:t.color}}>{t.label}</span>
              <span className="text-gray-600 ml-1 text-[9px]">+{Math.min(t.chargeAdd,100)}% charge / +{t.force} force</span>
            </div>
            <span className="text-gray-600 text-[9px]">{t.coins[0]}–{t.coins[1]===Infinity?'∞':t.coins[1]}🪙</span>
          </div>
        ))}
        <p className="text-[9px] text-gray-700 mt-2 text-center">Charging: fills bar • In-flight: forward boost!</p>
      </div>

      {/* Boost queue */}
      {boostQueue.length > 0 && (
        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
          <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-2">⚡ Queued ({boostQueue.length})</div>
          {boostQueue.slice(-5).map((b,i) => (
            <div key={i} className="flex items-center gap-2 bg-[#0a0b14] rounded px-2 py-1 mb-1 border border-[#1e2240]">
              <span>{b.emoji}</span>
              <span className="text-xs font-bold flex-1" style={{color:b.color}}>{b.label}</span>
              <span className="text-gray-600 text-[10px]">@{b.user}</span>
            </div>
          ))}
        </div>
      )}

      {/* Multipliers */}
      {phase !== 'idle' && phase !== 'chest_pick' && (
        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
          <div className="text-[9px] font-bold tracking-widest text-gray-500 uppercase mb-2">⚙ Round Multipliers</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-yellow-400">⚡ Launch Power</span><span className="font-black text-yellow-400">{multipliers.power.toFixed(1)}×</span></div>
            <div className="flex justify-between"><span className="text-orange-400">💣 Bombs</span><span className="font-black text-orange-400">{multipliers.bomb}</span></div>
            <div className="flex justify-between"><span className="text-purple-400">🟡 Bouncers</span><span className="font-black text-purple-400">{multipliers.bouncer}</span></div>
          </div>
        </div>
      )}

      {/* Dev inject */}
      {import.meta.env.DEV && (
        <div className="space-y-1">
          {Object.entries(GIFT_TIERS).map(([id, t]) => (
            <button key={id} onClick={() => engine.processGift(`viewer${Math.floor(Math.random()*99)}`, t.coins[0])}
              className="w-full text-xs border border-gray-800 rounded py-1 text-gray-600 hover:text-gray-400">
              🧪 {t.emoji} {t.label} gift
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
