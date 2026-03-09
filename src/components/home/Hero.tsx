"use client"
import Link from 'next/link'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/layout/Logo'

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-slate-950 min-h-screen flex items-center">
      <div className="absolute inset-0 bg-grid-slate-800 [mask-image:linear-gradient(to_bottom,white_10%,transparent_100%)] pointer-events-none opacity-20"></div>
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center rounded-full bg-slate-950/80 border border-cyan-500/50 backdrop-blur-xl mb-8 w-fit overflow-hidden pr-6 shadow-[0_0_20px_-5px_rgba(34,211,238,0.4)]">
              <div className="pl-5 pr-4 py-2 flex items-center justify-center"><Logo /></div>
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-slate-600 to-transparent mx-2"></div>
              <span className="text-cyan-400 text-sm font-medium tracking-wide">The Ultimate TikTok Tool</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold text-white mb-6 leading-[1.1]">
              Elevate Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">TikTok LIVE</span> Streams
            </h1>

            <p className="text-slate-400 text-lg mb-8 max-w-xl leading-relaxed">
              A comprehensive Windows desktop application for TikTok LIVE streamers. Create custom actions, trigger events based on viewer interactions, manage sound alerts, overlays, and more!
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Button asChild className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 border-0">
                <Link href="/signup">
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Get Started Free
                </Link>
              </Button>
              <Button variant="outline" className="h-12 px-8 text-base font-semibold border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300">
                Watch Demo
              </Button>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative rounded-3xl border border-slate-700/60 bg-slate-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <div className="absolute -top-32 -right-32 w-80 h-80 bg-purple-500/20 blur-[80px] rounded-full"></div>
              <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-cyan-500/20 blur-[80px] rounded-full"></div>
              <div className="relative p-8 md:p-12 flex flex-col items-center justify-center text-center z-10 min-h-[400px]">
                <div className="w-full bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 mb-10 backdrop-blur-md shadow-lg flex items-center justify-center">
                  <Logo />
                </div>
                <h2 className="text-2xl md:text-3xl font-medium text-white leading-relaxed tracking-tight max-w-lg mx-auto drop-shadow-xl">
                  A comprehensive Windows desktop application for TikTok LIVE streamers.
                </h2>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-6 bg-slate-950/95 border border-slate-800 p-5 rounded-xl shadow-2xl backdrop-blur-xl max-w-xs z-30 ring-1 ring-slate-800/50">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                </div>
                <span className="text-white font-bold text-sm tracking-wide">System Operational</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Connected to TikTok Live Gateway.<br />Real-time events active.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
