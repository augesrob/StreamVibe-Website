/**
 * GameRegistry — single source of truth for all StreamVibe Live Games.
 * requiredTiers matches actual plan tiers in the DB: basic, pro, legend
 */
export const GAME_REGISTRY = {
  live_words: {
    id:            'live_words',
    name:          'StreamVibe Live Words',
    tagline:       'Viewers race to find words from random letters in chat!',
    description:   'A letter-scramble game. Viewers type the command in chat to submit words.',
    icon:          '🔤',
    color:         'cyan',
    badge:         'NEW',
    requiredTiers: ['basic', 'pro', 'legend'],
    route:         '/tools/games/live-words',
    overlayRoute:  '/games-overlay/live-words',
    available:     true,
  },
  cannon_blast: {
    id:            'cannon_blast',
    name:          'Cannon Blast',
    tagline:       'Viewers gift to boost the cannon — who goes furthest?',
    description:   'Fire the cannon and let TikTok gifts power up every shot.',
    icon:          '💥',
    color:         'orange',
    badge:         'NEW',
    requiredTiers: ['basic', 'pro', 'legend'],
    route:         '/tools/games/cannon-blast',
    overlayRoute:  '/games-overlay/cannon-blast',
    available:     true,
  },
  plants_vs_zombies: {
    id:            'plants_vs_zombies',
    name:          'Plants vs Zombies LIVE',
    tagline:       'Viewers gift coins to spawn zombies — defend your garden!',
    description:   'TikTok gifts spawn zombies in real time. Place plants to defend!',
    icon:          '🌻',
    color:         'green',
    badge:         'NEW',
    requiredTiers: ['basic', 'pro', 'legend'],
    route:         '/tools/games/plants-vs-zombies',
    overlayRoute:  '/games-overlay/plants-vs-zombies',
    available:     true,
  },
};

export function getAvailableGames() {
  return Object.values(GAME_REGISTRY).filter(g => g.available);
}

export default GAME_REGISTRY;
