/**
 * GamesHub — rendered inside the 🎮 Games dashboard tab
 * Auto-renders game cards from GameRegistry.
 * Plan check uses userPlans from useAuth (same system as Billing page).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Lock, Zap } from 'lucide-react';
import { getAvailableGames } from '@/components/games/GameRegistry';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const COLOR_MAP = {
  cyan:   { border: 'border-cyan-500/20',   hover: 'hover:border-cyan-500',   icon: 'from-cyan-500/20 to-blue-600/20',  text: 'text-cyan-400'   },
  purple: { border: 'border-purple-500/20', hover: 'hover:border-purple-500', icon: 'from-purple-500/20 to-pink-600/20',text: 'text-purple-400' },
  green:  { border: 'border-green-500/20',  hover: 'hover:border-green-500',  icon: 'from-green-500/20 to-teal-600/20', text: 'text-green-400'  },
};

function GameCard({ game }) {
  const navigate = useNavigate();
  const { userPlans, isAdmin } = useAuth();
  const c = COLOR_MAP[game.color] ?? COLOR_MAP.cyan;

  const required = game.requiredPlanNames ?? [];
  const hasAccess = isAdmin || userPlans?.some(up => {
    const planName = up.plans?.name ?? '';
    return required.some(r => planName.toLowerCase() === r.toLowerCase());
  });

  return (
    <div onClick={() => navigate(hasAccess ? game.route : '/billing')}
      className={`bg-[#1a1a24] border ${c.border} rounded-xl p-5 cursor-pointer
        ${c.hover} hover:shadow-[0_0_20px_rgba(0,229,255,0.08)]
        transition-all group flex flex-col gap-3 relative overflow-hidden`}>

      {!hasAccess && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center
          justify-center rounded-xl z-10">
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <Lock className="w-8 h-8 text-yellow-400" />
            <span className="text-yellow-300 text-xs font-bold">Upgrade to unlock</span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.icon}
          border ${c.border} flex items-center justify-center text-2xl
          group-hover:scale-110 transition-transform`}>
          {game.icon}
        </div>
        <div className="flex gap-2 items-center">
          {game.badge && (
            <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-bold">
              {game.badge}
            </span>
          )}
          {!hasAccess && (
            <span className="text-[10px] bg-yellow-700/60 text-yellow-300 px-2 py-0.5
              rounded-full font-bold flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> PAID
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
          {game.name}
          <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-cyan-500" />
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed">{game.description}</p>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-semibold mt-auto">
        <span>📱</span> Works with TikTok Live Studio
      </div>
    </div>
  );
}

export default function GamesHub() {
  const games = getAvailableGames();
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">🎮 Live Games</h2>
      <p className="text-gray-400 mb-6 text-sm">
        Interactive games for your TikTok LIVE — viewers play through chat commands.
        Each game has a personal overlay URL for use as a Browser Source in TikTok Live Studio.
      </p>
      {games.length === 0 ? (
        <div className="text-gray-600 text-center py-12">No games available yet. Check back soon!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map(game => <GameCard key={game.id} game={game} />)}
        </div>
      )}
      <div className="mt-8 bg-[#151828] border border-[#1e2240] rounded-xl p-5 text-sm text-gray-500">
        <p className="font-semibold text-gray-400 mb-1">How it works</p>
        Each game has a unique overlay URL tied to your account. Add it as a Browser Source
        in TikTok Live Studio. Viewers interact via chat commands — no app download needed.
      </div>
    </div>
  );
}
