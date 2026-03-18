/**
 * GameRegistry — single source of truth for all StreamVibe Live Games.
 */
export const GAME_REGISTRY = {
  live_words: {
    id:                'live_words',
    name:              'StreamVibe Live Words',
    tagline:           'Viewers race to find words from random letters in chat!',
    description:       'A letter-scramble game. Viewers type the command in chat to submit words.',
    icon:              '🔤',
    color:             'cyan',
    badge:             'NEW',
    requiredPlanNames: ['Pro', 'Enterprise', 'pro', 'enterprise'],
    route:             '/tools/games/live-words',
    overlayRoute:      '/games-overlay/live-words',
    available:         true,
  },
  cannon_blast: {
    id:                'cannon_blast',
    name:              'Cannon Blast',
    tagline:           'Viewers gift to boost the cannon — who goes furthest?',
    description:       'Fire the cannon and let TikTok gifts power up every shot. Bigger gifts = bigger boosts. Real-time leaderboard tracks top blasters.',
    icon:              '💥',
    color:             'orange',
    badge:             'NEW',
    requiredPlanNames: ['Pro', 'Enterprise', 'pro', 'enterprise'],
    route:             '/tools/games/cannon-blast',
    overlayRoute:      '/games-overlay/cannon-blast',
    available:         true,
  },
};

export function getAvailableGames() {
  return Object.values(GAME_REGISTRY).filter(g => g.available);
}

export default GAME_REGISTRY;
