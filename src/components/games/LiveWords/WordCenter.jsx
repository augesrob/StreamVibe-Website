/**
 * WordCenter — TikTok connect, timer display, round controls, rejected feed
 * overlayUrl prop is passed from LiveWordsTool (includes ?token=)
 */
import React, { useState } from 'react';

export default function WordCenter({ engine, tiktok, connError, onClearError, overlayUrl }) {
  const { phase, remaining, startRound, finishRound, nextRound, fullReset } = engine;
  const { status, connect, disconnect, injectChat, username: connUser } = tiktok;
  const [usernameInput, setUsernameInput] = useState('');
  const [copied, setCopied] = useState(false);

  const isRunning  = phase === 'running';
  const isFinished = phase === 'finished';
  const isIdle     = phase === 'idle';

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');

  const statusDot = {
    disconnected: 'bg-gray-600',
    connecting:   'bg-orange-500 animate-pulse',
    connected:    'bg-green-500 shadow-[0_0_8px_#00e676]',
    error:        'bg-red-500',
  }[status] || 'bg-gray-600';

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

  return (
    <div className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto">

      {/* Overlay URL — with token, per user */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
        <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">
          🖥 Your Personal Overlay URL
        </p>
        {overlayUrl ? (
          <div className="flex gap-2">
            <button onClick={() => window.open(overlayUrl, '_blank')}
              className="flex-1 py-2 rounded-lg border border-[#1e2240] bg-[#0a0b14] text-cyan-400
                hover:border-cyan-600 font-mono text-xs font-bold tracking-widest transition-all">
              🖥 Preview
            </button>
            <button onClick={copyOverlayUrl}
              className="flex-1 py-2 rounded-lg border border-[#1e2240] bg-[#0a0b14] text-gray-400
                hover:border-gray-500 font-mono text-xs font-bold tracking-widest transition-all">
              {copied ? '✓ Copied!' : '📋 Copy URL'}
            </button>
          </div>
        ) : (
          <p className="text-gray-600 text-xs">Generating your overlay URL...</p>
        )}
        <p className="text-[10px] text-gray-700 mt-2">
          Add as Browser Source in TikTok Live Studio · Size: 1920×1080
        </p>
      </div>

      {/* Timer display */}
      <div className={`rounded-xl border p-4 flex items-center justify-center flex-col gap-1
        ${isRunning ? 'bg-green-950/20 border-green-900/30'
        : isFinished ? 'bg-red-950/20 border-red-900/30'
        : 'bg-[#151828] border-[#1e2240]'}`}>
        <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Time Remaining</span>
        <span className={`font-mono font-black text-5xl
          ${isRunning ? 'text-green-400' : isFinished ? 'text-red-400' : 'text-gray-600'}`}>
          {mins}:{secs}
        </span>
        {isFinished && <span className="text-red-400 text-xs font-bold tracking-widest animate-pulse">ROUND OVER</span>}
      </div>

      {/* Error banner */}
      {connError && (
        <div className="bg-red-950/30 border border-red-700/40 rounded-xl p-3 flex items-center justify-between text-red-400 text-sm">
          <span>⚠️ {connError}</span>
          <button onClick={onClearError} className="ml-3 text-red-600 hover:text-red-400 font-bold">✕</button>
        </div>
      )}

      {/* TikTok Connect */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <button onClick={handleConnect}
          className={`w-full py-3 rounded-lg font-mono font-black text-sm tracking-widest
            flex items-center justify-center gap-2 transition-all
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
            <input value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              placeholder="@yourtiktokusername"
              className="flex-1 bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-2
                text-white placeholder:text-gray-600 font-semibold focus:border-cyan-500 outline-none" />
          </div>
        )}
      </div>

      {/* Round Controls */}
      <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={startRound} disabled={isRunning}
            className="col-span-2 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600
              disabled:opacity-30 disabled:cursor-not-allowed text-black font-mono font-black
              text-xs tracking-widest hover:from-green-400 hover:to-green-500 transition-all">
            ▶ START ROUND
          </button>
          <button onClick={finishRound} disabled={isIdle || isFinished}
            className="py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-800
              disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono font-black
              text-xs tracking-widest hover:from-red-600 hover:to-red-700 transition-all">
            🏁 END ROUND
          </button>
          <button onClick={nextRound} disabled={!isFinished}
            className="py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700
              disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono font-black
              text-xs tracking-widest hover:from-blue-500 hover:to-blue-600 transition-all">
            ⏭ NEXT ROUND
          </button>
          <button onClick={fullReset}
            className="col-span-2 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-purple-800
              text-white font-mono font-black text-xs tracking-widest
              hover:from-purple-600 hover:to-purple-700 transition-all">
            ↺ FULL RESET (clears scores)
          </button>
        </div>
      </div>

      {/* Rejected Feed */}
      {engine.rejectedFeed.length > 0 && (
        <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-3">
          <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2">Recent Rejects</p>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {engine.rejectedFeed.slice(0, 10).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-red-600">✗</span>
                <span className="text-gray-500">@{r.user}:</span>
                <span className="text-red-400 font-mono font-bold">{r.text}</span>
                <span className="text-gray-700 text-[10px]">({r.reason})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {import.meta.env.DEV && (
        <button
          onClick={() => tiktok.injectChat(`viewer${Math.floor(Math.random()*999)}`,
            `${engine.chatCommand} ${engine.possibleWords[Math.floor(Math.random()*engine.possibleWords.length)] || 'end'}`)}
          className="text-xs text-gray-700 hover:text-gray-500 border border-gray-800 rounded-lg py-2 text-center transition-colors">
          🧪 Inject Test Chat (dev only)
        </button>
      )}
    </div>
  );
}
