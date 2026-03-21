import React, { useState } from 'react';
import { GIFT_TIERS, CHEST_PICKS } from '@/hooks/useCannonEngine';

export default function CannonControls({ engine, tiktok, connError, onClearError, overlayUrl }) {
  const { phase, score, bestScore, chargeLevel, multipliers, recentGifts,
          auctionPhase, auctionBids, startNewRound, endAuction, tapToShoot, resetRound } = engine;
  const { status, connect, disconnect, username: connUser } = tiktok;
  const [usernameInput, setUsernameInput] = useState('');
  const [copied, setCopied] = useState(false);

  const dot = { disconnected:'bg-gray-600', connecting:'bg-orange-500 animate-pulse',
    connected:'bg-green-500', error:'bg-red-500' }[status]??'bg-gray-600';

  const copyUrl = () => {
    if (!overlayUrl) return;
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  return (
    <div className="p-3 space-y-3">
      {/* Phase */}
      <div className="bg-[#0d0e1a] rounded-xl p-3 border border-[#1e2240]">
        <div className="text-xs text-gray-500 mb-1">PHASE</div>
        <div className="font-black text-sm text-white capitalize">{phase.replace(/_/g,' ')}</div>
        {score > 0 && <div className="text-xs text-yellow-400 mt-1">Score: {score}</div>}
      </div>

      {/* TikTok */}
      <div className="bg-[#0d0e1a] rounded-xl p-3 border border-[#1e2240] space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dot}`}/>
          <span className="text-xs font-black text-gray-400 tracking-wider">TIKTOK LIVE</span>
        </div>
        {status==='connected' ? (
          <div className="space-y-1">
            <div className="text-xs text-green-400">✅ @{connUser}</div>
            <button onClick={disconnect} className="w-full text-xs bg-red-900/30 border border-red-800 text-red-400 rounded-lg py-1.5">Disconnect</button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <input value={usernameInput} onChange={e=>setUsernameInput(e.target.value)}
              placeholder="@TikTok username"
              className="w-full bg-[#0a0b14] border border-[#2a3060] rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 outline-none"
              onKeyDown={e=>{ if(e.key==='Enter'&&usernameInput.trim()) connect(usernameInput.trim()); }}/>
            <button onClick={()=>connect(usernameInput.trim())} disabled={!usernameInput.trim()||status==='connecting'}
              className="w-full text-sm font-black bg-[#1e3a1e] border border-[#2a5a2a] text-green-400 rounded-lg py-2 disabled:opacity-40">
              {status==='connecting'?'Connecting...':'🔴 Go Live'}
            </button>
          </div>
        )}
        {connError && (
          <div className="text-xs text-red-400 bg-red-900/20 rounded-lg p-2">
            {connError} <button onClick={onClearError} className="ml-1 text-gray-500">✕</button>
          </div>
        )}
      </div>

      {/* Game controls */}
      <div className="bg-[#0d0e1a] rounded-xl p-3 border border-[#1e2240] space-y-2">
        <div className="text-xs text-gray-500 font-black tracking-wider">CONTROLS</div>
        {(phase==='idle'||phase==='landed') && (
          <button onClick={startNewRound} className="w-full text-sm font-black bg-green-900/40 border border-green-700 text-green-400 rounded-lg py-2">🚀 New Round</button>
        )}
        {phase==='auction' && (
          <button onClick={endAuction} className="w-full text-sm font-black bg-yellow-900/40 border border-yellow-700 text-yellow-400 rounded-lg py-2">🏆 End Auction</button>
        )}
        {phase==='tap_to_shoot' && (
          <button onClick={tapToShoot} className="w-full text-sm font-black bg-orange-900/40 border border-orange-600 text-orange-300 rounded-lg py-2">💥 SHOOT!</button>
        )}
        {phase!=='idle'&&phase!=='landed' && (
          <button onClick={resetRound} className="w-full text-xs bg-gray-900/40 border border-gray-700 text-gray-500 rounded-lg py-1.5">↺ Reset</button>
        )}
      </div>

      {/* Auction bids */}
      {phase==='auction' && Object.keys(auctionBids).length>0 && (
        <div className="bg-[#0d0e1a] rounded-xl p-3 border border-yellow-800/40 space-y-1">
          <div className="text-xs text-yellow-400 font-black tracking-wider mb-2">🏆 BIDS</div>
          {Object.entries(auctionBids).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([u,c],i)=>(
            <div key={u} className="flex items-center gap-2 text-xs">
              <span>{['🥇','🥈','🥉','4.','5.'][i]}</span>
              <span className="flex-1 text-white font-bold truncate">@{u}</span>
              <span className="text-yellow-400 font-black">{c.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent gifts */}
      {recentGifts?.length>0 && (
        <div className="bg-[#0d0e1a] rounded-xl p-3 border border-[#1e2240] space-y-1">
          <div className="text-xs text-gray-500 font-black tracking-wider mb-1">GIFTS</div>
          {recentGifts.slice(0,5).map((g,i)=>(
            <div key={g.ts} className="flex items-center gap-2 text-xs" style={{opacity:1-i*0.18}}>
              <span>{g.tier.emoji}</span>
              <span className="flex-1 text-white font-bold truncate">@{g.user}</span>
              <span style={{color:g.tier.color}} className="font-black">{g.tier.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gift tier reference */}
      <div className="bg-[#0d0e1a] rounded-xl p-3 border border-[#1e2240]">
        <div className="text-xs text-gray-500 font-black tracking-wider mb-2">GIFT TIERS</div>
        {Object.values(GIFT_TIERS).slice(0,5).map(t=>(
          <div key={t.label} className="flex items-center gap-2 text-xs mb-1">
            <span>{t.emoji}</span>
            <span style={{color:t.color}} className="font-black">{t.label}</span>
            <span className="text-gray-600 flex-1 text-right">{t.coins[0].toLocaleString()}+</span>
          </div>
        ))}
      </div>

      {/* Overlay URL */}
      {overlayUrl && (
        <div className="bg-[#0d0e1a] rounded-xl p-3 border border-[#1e2240] space-y-2">
          <div className="text-xs text-gray-500 font-black tracking-wider">🎬 OVERLAY</div>
          <div className="text-xs text-gray-500 bg-[#060710] rounded-lg p-2 break-all">{overlayUrl}</div>
          <button onClick={copyUrl} className="w-full text-xs font-black bg-[#1e2a3e] border border-[#2a3a5a] text-blue-400 rounded-lg py-2">
            {copied?'✅ Copied!':'📋 Copy URL'}
          </button>
          <div className="text-xs text-gray-600 leading-relaxed">
            TikTok Live Studios → Browser Source<br/>
            Size: 1080×1920 • ✅ Transparent BG
          </div>
        </div>
      )}
    </div>
  );
}
