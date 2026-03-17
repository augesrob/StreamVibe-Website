/**
 * GamePlanGate
 * Checks the user's active plans (userPlans from useAuth)
 * and blocks access if they don't have a required plan.
 * To change which plan unlocks a game → edit requiredPlanNames in GameRegistry.js
 */
import React from 'react';
import { Lock, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export default function GamePlanGate({ game, children }) {
  const { user, userPlans, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Checking access…
      </div>
    );
  }

  // Admins always get access
  if (isAdmin) return <>{children}</>;

  // Check if any of the user's active plans match the required plan names
  const required = game.requiredPlanNames ?? [];
  const hasAccess = userPlans?.some(up => {
    const planName = up.plans?.name ?? '';
    return required.some(r => planName.toLowerCase() === r.toLowerCase());
  });

  if (hasAccess) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-600/20
        border border-yellow-500/30 flex items-center justify-center">
        <Lock className="w-10 h-10 text-yellow-400" />
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-white mb-2">Upgrade Required</h2>
        <p className="text-gray-400 leading-relaxed">
          <span className="text-cyan-400 font-semibold">{game.name}</span> requires an active paid plan.
          Upgrade to unlock all interactive live games.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => navigate('/billing')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm
            bg-gradient-to-r from-yellow-500 to-orange-500 text-black
            hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg shadow-yellow-500/20">
          <Zap className="w-4 h-4" /> Upgrade Now <ArrowRight className="w-4 h-4" />
        </button>
        <button onClick={() => navigate('/dashboard')}
          className="px-6 py-3 rounded-xl font-bold text-sm border border-gray-700
            text-gray-400 hover:border-gray-500 hover:text-white transition-all">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
