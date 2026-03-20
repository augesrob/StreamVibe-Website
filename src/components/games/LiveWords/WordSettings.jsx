/**
 * WordSettings — command, timer, min-length, dupe settings, overlay theme, chat mode toggle
 */
import React from 'react';
import { Settings } from 'lucide-react';

const OVERLAY_THEMES = [
  { id:'purple',  label:'Purple',  e:'💜', bg:'from-purple-700 to-purple-900' },
  { id:'dark',    label:'Dark',    e:'🌑', bg:'from-slate-800 to-slate-950' },
  { id:'neon',    label:'Neon',    e:'💚', bg:'from-green-900 to-black' },
  { id:'fire',    label:'Fire',    e:'🔥', bg:'from-orange-700 to-red-900' },
  { id:'ocean',   label:'Ocean',   e:'🌊', bg:'from-cyan-800 to-blue-950' },
  { id:'gold',    label:'Gold',    e:'✨', bg:'from-yellow-700 to-amber-900' },
];

export default function WordSettings({ engine }) {
  const {
    roundDuration, setRoundDuration,
    chatCommand,   setChatCommand,
    chatMode,      setChatMode,
    minWordLength, setMinWordLength,
    allowDupes,    setAllowDupes,
    overlayTheme,  setOverlayTheme,
  } = engine;

  const isCommand = chatMode === 'command';

  return (
    <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Game Settings</span>
      </div>

      {/* ── Chat Mode Toggle ───────────────────────────────────────────── */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
          Chat Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setChatMode('command')}
            className={`py-2 rounded-lg text-xs font-black tracking-wider border transition-all ${
              isCommand
                ? 'bg-cyan-500 border-cyan-400 text-black'
                : 'bg-[#0a0b14] border-[#1e2240] text-gray-500 hover:border-gray-600'
            }`}>
            ⌨️ Command
          </button>
          <button
            onClick={() => setChatMode('any')}
            className={`py-2 rounded-lg text-xs font-black tracking-wider border transition-all ${
              !isCommand
                ? 'bg-purple-500 border-purple-400 text-white'
                : 'bg-[#0a0b14] border-[#1e2240] text-gray-500 hover:border-gray-600'
            }`}>
            💬 Any Chat
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5">
          {isCommand
            ? <>Viewers type: <span className="text-cyan-500 font-mono">{chatCommand} bend</span></>
            : 'Any chat message is treated as a word guess'
          }
        </p>
      </div>

      {/* ── Command prefix (only relevant in command mode) ─────────────── */}
      <div className={isCommand ? '' : 'opacity-40 pointer-events-none'}>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
          Command Prefix
        </label>
        <input value={chatCommand} onChange={e => setChatCommand(e.target.value || '!word')}
          className="w-full bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:border-cyan-500 outline-none"
          placeholder="!word" />
      </div>

      {/* Round Duration */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
          Round Duration: <span className="text-cyan-400">{roundDuration}s</span>
        </label>
        <input type="range" min={15} max={300} step={15} value={roundDuration}
          onChange={e => setRoundDuration(Number(e.target.value))} className="w-full accent-cyan-500" />
        <div className="flex justify-between text-[10px] text-gray-700 mt-0.5"><span>15s</span><span>5 min</span></div>
      </div>

      {/* Min Word Length */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
          Min Word Length: <span className="text-cyan-400">{minWordLength} letters</span>
        </label>
        <input type="range" min={2} max={6} step={1} value={minWordLength}
          onChange={e => setMinWordLength(Number(e.target.value))} className="w-full accent-cyan-500" />
        <div className="flex justify-between text-[10px] text-gray-700 mt-0.5"><span>2</span><span>6</span></div>
      </div>

      {/* Allow Duplicates */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Allow Duplicate Words</p>
          <p className="text-[10px] text-gray-600">Multiple viewers can score the same word</p>
        </div>
        <button onClick={() => setAllowDupes(v => !v)}
          className={`w-12 h-6 rounded-full transition-all relative ${allowDupes ? 'bg-cyan-500' : 'bg-gray-700'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${allowDupes ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Overlay Theme */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">🎨 Overlay Theme</label>
        <div className="grid grid-cols-3 gap-2">
          {OVERLAY_THEMES.map(t => (
            <button key={t.id} onClick={() => setOverlayTheme(t.id)}
              className={`flex flex-col items-center rounded-lg border-2 overflow-hidden transition-all
                ${overlayTheme === t.id ? 'border-cyan-500 shadow-[0_0_10px_rgba(0,229,255,0.3)]' : 'border-transparent hover:border-white/20'}`}>
              <div className={`w-full h-8 bg-gradient-to-r ${t.bg}`} />
              <div className="text-[10px] text-gray-400 py-0.5 bg-[#0a0b14] w-full text-center font-semibold">
                {t.e} {t.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
