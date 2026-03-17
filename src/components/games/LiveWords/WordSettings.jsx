/**
 * WordSettings — command, timer, min-length, dupe settings panel
 */
import React from 'react';
import { Settings } from 'lucide-react';

export default function WordSettings({ engine }) {
  const {
    roundDuration, setRoundDuration,
    chatCommand,   setChatCommand,
    minWordLength, setMinWordLength,
    allowDupes,    setAllowDupes,
  } = engine;

  return (
    <div className="bg-[#151828] border border-[#1e2240] rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Game Settings</span>
      </div>

      {/* Chat Command */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
          Chat Command
        </label>
        <input
          value={chatCommand}
          onChange={e => setChatCommand(e.target.value || '!word')}
          className="w-full bg-[#0a0b14] border border-[#1e2240] rounded-lg px-3 py-2
            text-white font-mono font-bold text-sm focus:border-cyan-500 outline-none"
          placeholder="!word"
        />
        <p className="text-[10px] text-gray-600 mt-1">
          Viewers type: <span className="text-cyan-600 font-mono">{chatCommand} bend</span>
        </p>
      </div>

      {/* Round Duration */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
          Round Duration: <span className="text-cyan-400">{roundDuration}s</span>
        </label>
        <input
          type="range" min={15} max={300} step={15}
          value={roundDuration}
          onChange={e => setRoundDuration(Number(e.target.value))}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-[10px] text-gray-700 mt-0.5">
          <span>15s</span><span>5 min</span>
        </div>
      </div>

      {/* Min Word Length */}
      <div>
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
          Min Word Length: <span className="text-cyan-400">{minWordLength} letters</span>
        </label>
        <input
          type="range" min={2} max={6} step={1}
          value={minWordLength}
          onChange={e => setMinWordLength(Number(e.target.value))}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-[10px] text-gray-700 mt-0.5">
          <span>2</span><span>6</span>
        </div>
      </div>

      {/* Allow Duplicates */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Allow Duplicate Words</p>
          <p className="text-[10px] text-gray-600">Multiple viewers can score the same word</p>
        </div>
        <button
          onClick={() => setAllowDupes(v => !v)}
          className={`w-12 h-6 rounded-full transition-all relative ${allowDupes ? 'bg-cyan-500' : 'bg-gray-700'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all
            ${allowDupes ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>
    </div>
  );
}
