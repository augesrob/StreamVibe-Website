/**
 * GameRegistry — single source of truth for all StreamVibe Live Games.
 *
 * requiredPlanNames: plan names (from `plans` table) that grant access.
 * To change which plan unlocks a game → edit this array.
 * Plan names must match exactly what's in your Supabase `plans` table.
 *
 * To add a new game:
 * 1. Add an entry here
 * 2. Add its route in App.jsx
 * Done — GamesHub auto-renders it.
 */

export const GAME_REGISTRY = {
  live_words: {
    id:          'live_words',
    name:        'StreamVibe Live Words',
    tagline:     'Viewers race to find words from random letters in chat!',
    description: 'A letter-scramble game streamed live. Viewers type the command in chat to submit words. Score points by finding longer words. Works as a Browser Source in TikTok Live Studio.',
    icon:        '🔤',
    color:       'cyan',
    badge:       'NEW',
    // ↓ Change these to match your plan names in Supabase → plans table
    requiredPlanNames: ['Pro', 'Enterprise', 'pro', 'enterprise'],
    route:       '/tools/games/live-words',
    overlayRoute:'/games-overlay/live-words',
    available:   true,
  },
  // ── Add future games below ─────────────────────────────────────────────────
  // trivia: {
  //   id: 'trivia', name: 'StreamVibe Live Trivia', available: false,
  //   requiredPlanNames: ['Pro', 'Enterprise'],
  //   route: '/tools/games/trivia', overlayRoute: '/games-overlay/trivia',
  //   icon: '❓', color: 'purple', badge: 'SOON',
  // },
};

export function getAvailableGames() {
  return Object.values(GAME_REGISTRY).filter(g => g.available);
}

export default GAME_REGISTRY;
