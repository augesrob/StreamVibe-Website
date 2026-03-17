import React, { useState } from 'react';

const THEMES = [
  { id:'dark',        label:'Dark',        cls:'bg-[#10121f]',                                              e:'🌑' },
  { id:'gradient',    label:'Gradient',    cls:'bg-gradient-to-br from-purple-600 to-cyan-400',             e:'🌈' },
  { id:'neon',        label:'Neon',        cls:'bg-[#001408] border border-green-500',                      e:'💚' },
  { id:'red',         label:'Red',         cls:'bg-red-800',                                                e:'🔴' },
  { id:'blue',        label:'Blue',        cls:'bg-blue-900',                                               e:'🔵' },
  { id:'green',       label:'Green',       cls:'bg-green-900',                                              e:'💚' },
  { id:'cyber',       label:'Cyber',       cls:'bg-gradient-to-br from-cyan-600 to-green-500',              e:'🤖' },
  { id:'fire',        label:'Fire',        cls:'bg-gradient-to-br from-orange-600 to-yellow-400',           e:'🔥' },
  { id:'aurora',      label:'Aurora',      cls:'bg-gradient-to-br from-purple-500 to-cyan-400',             e:'✨' },
  { id:'rainbow',     label:'Rainbow',     cls:'bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400', e:'🌈' },
  { id:'pulse',       label:'Pulse',       cls:'bg-purple-700',                                             e:'💜' },
  { id:'matrix',      label:'Matrix',      cls:'bg-[#001405] border border-green-600',                      e:'🟩' },
  { id:'transparent', label:'Transparent', cls:'bg-[repeating-conic-gradient(#888_0%_25%,#555_0%_50%)] bg-[length:16px_16px]', e:'👻' },
];

export default function OverlaySetup() {
  const [selected, setSelected] = useState('dark');
  const [opacity, setOpacity]   = useState(85);
  const [showUrl, setShowUrl]   = useState(false);
  const [copied, setCopied]     = useState(false);

  const overlayUrl = `${window.location.origin}/overlay`;

  const applyTheme = (id) => {
    setSelected(id);
    try {
      localStorage.setItem('sv_overlay_theme', JSON.stringify({ theme: id, opacity: opacity / 100 }));
      const raw = localStorage.getItem('sv_auction_overlay_state');
      if (raw) {
        const s = JSON.parse(raw);
        localStorage.setItem('sv_auction_overlay_state', JSON.stringify({ ...s, theme: id }));
      }
    } catch (_) {}
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(overlayUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] text-white p-10 pt-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff0050] to-[#fe2c55] flex items-center justify-center text-xl shadow-[0_0_16px_rgba(255,0,80,0.4)]">♪</div>
        <div>
          <h1 className="font-mono font-black text-xl">TikTok Live Studio Overlay</h1>
          <p className="text-gray-500 text-sm">Add this as a Web Source in TikTok Live Studio</p>
        </div>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-3 bg-[#10121f] border border-[#1e2240] rounded-xl px-4 py-3 mb-3">
        <input type={showUrl ? 'text' : 'password'} readOnly value={overlayUrl}
          className="flex-1 bg-transparent border-none outline-none text-gray-400 font-mono text-sm" />
        <button onClick={() => setShowUrl(v => !v)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-700 text-black font-mono font-bold text-xs">
          👁 {showUrl ? 'Hide' : 'Show'}
        </button>
        <button onClick={copyUrl}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-700 to-red-800 text-white font-mono font-bold text-xs">
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
        <button onClick={() => alert('TikTok Live Studio → Add Source → Web Source → Paste URL → Set size 1920×1080')}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-700 to-pink-900 text-white font-mono font-bold text-xs">
          🎬 Tutorial
        </button>
      </div>

      {/* Warning */}
      <div className="bg-red-950/20 border border-red-800/40 rounded-xl px-4 py-3 mb-3 text-red-300 text-sm">
        <strong className="text-red-500">SECURITY WARNING:</strong> This URL is private.{' '}
        <strong>Never share it with anyone!</strong>
      </div>

      {/* Setup note */}
      <div className="bg-black/30 border border-[#1e2240] rounded-xl px-4 py-3 mb-8 text-gray-500 text-sm">
        <strong className="text-gray-400">Setup:</strong> TikTok Live Studio → Add Web Source → Paste URL → Size:{' '}
        <span className="text-cyan-500">1920×1080</span>
      </div>

      {/* Theme picker */}
      <h2 className="text-cyan-400 font-mono font-bold text-sm tracking-widest uppercase mb-2">🎨 Overlay Customization</h2>
      <p className="text-gray-500 text-sm mb-4">Choose a style:</p>
      <div className="grid grid-cols-8 gap-3 mb-6">
        {THEMES.map(t => (
          <button key={t.id} onClick={() => applyTheme(t.id)}
            className={`flex flex-col items-center rounded-xl border-2 overflow-hidden transition-all ${
              selected === t.id
                ? 'border-cyan-500 shadow-[0_0_14px_rgba(0,229,255,0.35)]'
                : 'border-transparent hover:scale-105'
            }`}>
            <div className={`w-full aspect-video rounded-t-lg ${t.cls}`} />
            <div className="text-[11px] text-gray-400 py-1 font-semibold bg-[#10121f] w-full text-center">
              {t.e} {t.label}
            </div>
          </button>
        ))}
      </div>

      {/* Opacity */}
      <div className="flex items-center gap-4 mb-8">
        <span className="text-gray-400 text-sm min-w-[200px]">
          Background Opacity:{' '}
          <span className="text-cyan-400 font-mono font-bold">{opacity}%</span>
        </span>
        <input type="range" min="10" max="100" value={opacity}
          onChange={e => { setOpacity(+e.target.value); applyTheme(selected); }}
          className="flex-1 accent-cyan-500" />
      </div>

      {/* Save note */}
      <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
        <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_#00e676]" />
        Changes are applied instantly to your overlay!
      </div>
    </div>
  );
}
