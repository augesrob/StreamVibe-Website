/**
 * GameRegistry — single source of truth for all StreamVibe Live Games.
 *
 * To add a new game:
 * 1. Add an entry to GAME_REGISTRY.
 * 2. Add its route(s) in App.jsx.
 * 3. Done — GamesHub auto-renders from this registry.
 */

export const GAME_REGISTRY = {
  live_words: {
    id:          'live_words',
    name:        'StreamVibe Live Words',
    tagline:     'Viewers race to find words from random letters in chat!',
    description: 'A letter-scramble game streamed live. Viewers type the command in chat to submit words. Score points by finding longer words. Runs as a browser source in TikTok Live Studio.',
    icon:        '🔤',
    color:       'cyan',
    badge:       'NEW',
    requiredPermission: 'games_live_words',
    fallbackRoles:      ['pro', 'enterprise', 'admin', 'super_admin'],
    route:       '/tools/games/live-words',
    overlayRoute:'/games-overlay/live-words',
    available:   true,
  },
  // ── Add future games below ────────────────────────────────────────────────
  // trivia: {
  //   id: 'trivia', name: 'StreamVibe Live Trivia', available: false,
  //   requiredPermission: 'games_trivia', fallbackRoles: ['pro','enterprise','admin'],
  //   route: '/tools/games/trivia', overlayRoute: '/games-overlay/trivia',
  //   icon: '❓', color: 'purple', badge: 'SOON',
  // },
};

export function getAvailableGames() {
  return Object.values(GAME_REGISTRY).filter(g => g.available);
}

export default GAME_REGISTRY;
