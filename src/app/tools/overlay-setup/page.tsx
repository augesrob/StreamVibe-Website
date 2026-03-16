'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const THEMES = [
  { id:'dark',        label:'Dark',        preview:'bg-[#10121f]',                                         emoji:'🌑' },
  { id:'gradient',    label:'Gradient',    preview:'bg-gradient-to-br from-purple-600 to-cyan-400',        emoji:'🌈' },
  { id:'neon',        label:'Neon',        preview:'bg-[#001408] border border-green-500',                 emoji:'💚' },
  { id:'red',         label:'Red',         preview:'bg-red-800',                                           emoji:'🔴' },
  { id:'blue',        label:'Blue',        preview:'bg-blue-900',                                          emoji:'🔵' },
  { id:'green',       label:'Green',       preview:'bg-green-900',                                         emoji:'💚' },
  { id:'cyber',       label:'Cyber',       preview:'bg-gradient-to-br from-cyan-600 to-green-500',        emoji:'🤖' },
  { id:'fire',        label:'Fire',        preview:'bg-gradient-to-br from-orange-600 to-yellow-400',     emoji:'🔥' },
  { id:'aurora',      label:'Aurora',      preview:'bg-gradient-to-br from-purple-500 to-cyan-400',       emoji:'✨' },
  { id:'rainbow',     label:'Rainbow',     preview:'bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400', emoji:'🌈' },
  { id:'pulse',       label:'Pulse',       preview:'bg-purple-700',                                        emoji:'💜' },
  { id:'matrix',      label:'Matrix',      preview:'bg-[#001405] border border-green-600',                emoji:'🟩' },
  { id:'transparent', label:'Transparent', preview:'bg-[length:16px_16px]',                               emoji:'👻' },
]

export default function OverlaySetupPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selected, setSelected] = useState('dark')
  const [opacity, setOpacity]   = useState(85)
  const [showUrl, setShowUrl]   = useState(false)
  const [copied, setCopied]     = useState(false)

  const overlayUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/overlay`
    : '/overlay'

  const applyTheme = (id: string) => {
    setSelected(id)
    try {
      localStorage.setItem('sv_overlay_theme', JSON.stringify({ theme: id, opacity: opacity / 100 }))
      const raw = localStorage.getItem('sv_auction_overlay_state')
      if (raw) {
        const s = JSON.parse(raw)
        localStorage.setItem('sv_auction_overlay_state', JSON.stringify({ ...s, theme: id }))
      }
    } catch (_) {}
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(overlayUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading || !user) return null

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
          className="flex-1 bg-transparent border-none outline-none text-gray-400 font-mono text-sm tracking-wide" />
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

      {/* Security warning */}
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
      <h2 className="text-cyan-400 font-mono font-bold text-sm tracking-widest uppercase mb-4">🎨 Overlay Customization</h2>
      <p className="text-gray-500 text-sm mb-4">Choose a style:</p>

      <div className="grid grid-cols-8 gap-3 mb-6">
        {THEMES.map(t => (
          <button key={t.id} onClick={() => applyTheme(t.id)}
            className={`flex flex-col items-center rounded-xl border-2 overflow-hidden transition-all ${
              selected === t.id
                ? 'border-cyan-500 shadow-[0_0_14px_rgba(0,229,255,0.35)]'
                : 'border-transparent hover:scale-105'
            }`}>
            <div className={`w-full aspect-video rounded-t-lg ${t.preview}`} />
            <div className="text-[11px] text-gray-400 py-1 font-semibold bg-[#10121f] w-full text-center">
              {t.emoji} {t.label}
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
        <input type="range" min={10} max={100} value={opacity}
          onChange={e => { setOpacity(+e.target.value); applyTheme(selected) }}
          className="flex-1 accent-cyan-500" />
      </div>

      {/* Save note */}
      <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
        <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_#00e676]" />
        Changes are applied instantly to your overlay!
      </div>
    </div>
  )
}
