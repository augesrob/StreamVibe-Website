import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuctionCenter({ engine, tiktok, connError, onClearError, overlayUrl }) {
  const { phase, start, pause, finish, restart, adjust } = engine;
  const { status, connect, disconnect, injectTestBid, username: connUser } = tiktok;
  const [usernameInput, setUsernameInput] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const isRunning  = phase === 'running' || phase === 'snipe';
  const isIdle     = phase === 'idle';
  const isFinished = phase === 'finished';
  const isPaused   = phase === 'paused';

  const earnings    = engine.bids.reduce((sum, b) => sum + b.coins, 0);
  const earningsUsd = (earnings * 0.0065).toFixed(2);

  const handleConnect = () => {
    if (status === 'connected') { disconnect(); return; }
    if (!usernameInput.trim()) return;
    connect(usernameInput.trim());
  };

  const copyOverlayUrl = () => {
    if (!overlayUrl) return;
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusDot = {
    disconnected: 'bg-gray-600',
    connecting:   'bg-orange-500 animate-pulse',
    connected:    'bg-green-500 shadow-[0_0_8px_#00e676]',
    error:        'bg-red-500',
  }[status] || 'bg-gray-600';

  return (
    <div className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto">

      {/* Top bar — overlay links with token */}
      <div className="flex gap-2">
        <button
          onClick={() => overlayUrl && window.open(overlayUrl, '_blank')}
          disabled={!overlayUrl}
          className="flex-1 py-2 rounded-lg border border-[#1e2240] bg-[#151828] text-gray-400
            hover:border-cyan-600 hover:text-cyan-400 font-mono text-xs font-bold tracking-widest
            flex items-center justify-center gap-2 transition-all disabled:opacity-40">
          🖥 Overlay Preview
        </button>
        <button
          onClick={copyOverlayUrl}
          disabled={!overlayUrl}
          className="flex-1 py-2 rounded-lg border border-[#1e2240] bg-[#151828] text-gray-400
            hover:border-green-600 hover:text-green-400 font-mono text-xs font-bold tracking-widest
            flex items-center justify-center gap-2 transition-all disabled:opacity-40">
          {copied ? '✓ Copied!' : '📋 Copy URL'}
        </button>
        <button onClick={() => navigate('/tools/overlay-setup')}
          className="flex-1 py-2 rounded-lg border border-[#1e2240] bg-[#151828] text-gray-400
            hover:border-purple-600 hover:text-purple-400 font-mono text-xs font-bold tracking-widest
            flex items-center justify-center gap-2 transition-all">
          🎨 Setup
        </button>
      </div>

      {/* Earnings */}
      <div className="bg-green-950/20 border border-green-900/30 rounded-xl p-3 flex items-center gap-4">
        <span className="text-xl">🪙</span>
        <div>
          <div className="text-[11px] text-green-700 font-semibold uppercase tracking-widest">Your Earnings (43%)</div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xl font-black text-green-400">{earnings.toLocaleString()}</span>
            <span className="text-green-600 text-sm">${earningsUsd} USD</span>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-cyan-950/20 border border-cyan-900/20 rounded-xl p-3 flex items-center gap-2 text-cyan-700 text-sm">
        💡 Don't forget to connect to your TikTok Live for real-time donations
      </div>

      {/* Error banner */}
      {connError && (
        <div className="bg-red-950/30 border border-red-700/40 rounded-xl p-3 flex items-center justify-between text-red-400 text-sm">
          <span>⚠️ {connError}</span>
          <button onClick={onClearError} className="ml-3 text-red-600 hover:text-red-400 font-bold">✕</button>
        </div>
      )}

      {/* Connect */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <button onClick={handleConnect}
          className={`w-full py-3 rounded-lg font-mono font-black text-sm tracking-widest flex items-center justify-center gap-2 transition-all
            ${status === 'connected'
              ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-black shadow-lg shadow-cyan-500/20'
            }`}>
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot}`} />
          {status === 'connected'
            ? `CONNECTED (@${connUser}) — Click to Disconnect`
            : status === 'connecting' ? 'CONNECTING…' : '♪  CONNECT MY LIVE'}
        </button>
        {status !== 'connected' && (
          <div className="flex gap-2 mt-3">
            <input
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              placeholder="@yourtiktokusername"
              className="flex-1 bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-2 text-white placeholder:text-gray-600 font-semibold focus:border-cyan-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={start} disabled={isRunning}
            className="py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 disabled:opacity-30 disabled:cursor-not-allowed
              text-black font-mono font-black text-xs tracking-widest hover:from-green-400 hover:to-green-500 transition-all">
            ▶ START MATCH
          </button>
          <button onClick={pause} disabled={isIdle || isFinished}
            className="py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 disabled:opacity-30 disabled:cursor-not-allowed
              text-white font-mono font-black text-xs tracking-widest hover:from-orange-500 hover:to-orange-600 transition-all">
            {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
          </button>
          <button onClick={finish} disabled={isIdle || isFinished}
            className="col-span-2 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-800 disabled:opacity-30 disabled:cursor-not-allowed
              text-white font-mono font-black text-xs tracking-widest hover:from-red-600 hover:to-red-700 transition-all">
            🏁 FINISH
          </button>
          <button onClick={restart}
            className="col-span-2 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-purple-800
              text-white font-mono font-black text-xs tracking-widest hover:from-purple-600 hover:to-purple-700 transition-all">
            ↺ RESTART
          </button>
        </div>
      </div>

      {/* Quick Time Adjust */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase text-center mb-3">⏱ QUICK TIME ADJUST</div>
        <div className="flex gap-2 justify-center">
          {[[-30,'red'],[-10,'red'],[+10,'green'],[+30,'green']].map(([d, c]) => (
            <button key={d} onClick={() => adjust(d)}
              className={`px-4 py-2 rounded-lg font-mono text-xs font-bold border transition-all
                ${c === 'red'
                  ? 'bg-red-950/30 border-red-900/40 text-red-400 hover:bg-red-900/30'
                  : 'bg-green-950/30 border-green-900/40 text-green-400 hover:bg-green-900/30'
                }`}>
              {d > 0 ? `+${d}s` : `${d}s`}
            </button>
          ))}
        </div>
      </div>

      {import.meta.env.DEV && (
        <button
          onClick={() => injectTestBid(`user${Math.floor(Math.random()*999)}`, Math.floor(Math.random()*500)+50)}
          className="text-xs text-gray-700 hover:text-gray-500 border border-gray-800 rounded-lg py-2 text-center transition-colors">
          🧪 Inject Test Bid (dev only)
        </button>
      )}
    </div>
  );
}
