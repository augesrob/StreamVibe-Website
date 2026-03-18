/**
 * useCannonEngine — Physics engine for Cannon Blast
 *
 * TikTok Gift → Boost mapping:
 *   Rose (1 coin)        → Small boost (+15% power)
 *   TikTok (1 coin)      → Small boost
 *   Finger Heart (5)     → Medium boost (+35% power)
 *   Sunglasses (16)      → Large boost (+60% power)
 *   Drama Queen (100)    → MEGA boost (x2 power, double gravity)
 *   Lion (29999)         → ULTRA boost (x5 power, explode effect)
 *   Any gift 1-9 coins   → Small
 *   Any gift 10-99       → Medium
 *   Any gift 100-999     → Large
 *   Any gift 1000+       → MEGA
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export const BOOST_TIERS = {
  small:  { label: 'Boost!',       color: '#00e5ff', power: 1.15, emoji: '💨', coins: [1,9]   },
  medium: { label: 'Power Boost!', color: '#ffd600', power: 1.35, emoji: '⚡', coins: [10,99]  },
  large:  { label: 'Super Boost!', color: '#ff6d00', power: 1.60, emoji: '🔥', coins: [100,999]},
  mega:   { label: 'MEGA BLAST!',  color: '#ff1744', power: 2.00, emoji: '💥', coins: [1000,9999]},
  ultra:  { label: 'ULTRA BLAST!', color: '#ea80fc', power: 5.00, emoji: '🌟', coins: [10000,Infinity]},
};

function getBoostTier(coins) {
  for (const [id, tier] of Object.entries(BOOST_TIERS)) {
    if (coins >= tier.coins[0] && coins <= tier.coins[1]) return { id, ...tier };
  }
  return { id: 'small', ...BOOST_TIERS.small };
}

// Physics constants
const GRAVITY       = 9.8;    // m/s²
const BASE_POWER    = 28;     // m/s initial velocity
const LAUNCH_ANGLE  = 45;     // degrees (optimal)
const GROUND_Y      = 0;
const TICK_MS       = 16;     // ~60fps

export function useCannonEngine() {
  const [phase, setPhase]           = useState('idle'); // idle|charging|launched|landed
  const [angle, setAngle]           = useState(LAUNCH_ANGLE);
  const [power, setPower]           = useState(BASE_POWER);
  const [ballPos, setBallPos]       = useState({ x: 0, y: 0 });
  const [distance, setDistance]     = useState(0);
  const [topDistance, setTopDistance]   = useState(0);
  const [activePowerMultiplier, setActivePowerMultiplier] = useState(1);
  const [activeBoost, setActiveBoost]   = useState(null); // { label, color, emoji }
  const [boostQueue, setBoostQueue]     = useState([]);
  const [leaderboard, setLeaderboard]   = useState([]); // [{user, distance, ts}]
  const [lastShooter, setLastShooter]   = useState(null);
  const [particles, setParticles]       = useState([]);
  const [roundCount, setRoundCount]     = useState(0);

  const phaseRef   = useRef('idle');
  const posRef     = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const multRef    = useRef(1);
  const timerRef   = useRef(null);
  const boostRef   = useRef([]);

  const stopPhysics = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Drain boost queue and apply next boost before launch
  const applyNextBoost = useCallback(() => {
    const queue = boostRef.current;
    if (!queue.length) return;
    const boost = queue.shift();
    boostRef.current = [...queue];
    setBoostQueue([...queue]);
    multRef.current = multRef.current * boost.power;
    setActivePowerMultiplier(multRef.current);
    setActiveBoost(boost);
    setTimeout(() => setActiveBoost(null), 3000);
  }, []);

  const launch = useCallback((shooter = 'host') => {
    if (phaseRef.current === 'launched') return;
    stopPhysics();

    // Apply any queued boosts
    const queue = boostRef.current;
    let totalMult = 1;
    let lastBoost = null;
    queue.forEach(b => { totalMult *= b.power; lastBoost = b; });
    boostRef.current = [];
    setBoostQueue([]);
    if (lastBoost) { setActiveBoost(lastBoost); setTimeout(() => setActiveBoost(null), 3000); }

    const finalPower = BASE_POWER * totalMult;
    const rad = (angle * Math.PI) / 180;
    const vx  = finalPower * Math.cos(rad);
    const vy  = finalPower * Math.sin(rad);

    posRef.current = { x: 0, y: 0, vx, vy };
    setPhase('launched'); phaseRef.current = 'launched';
    setLastShooter(shooter);
    setRoundCount(n => n + 1);
    multRef.current = 1;
    setActivePowerMultiplier(1);
    let t = 0;

    timerRef.current = setInterval(() => {
      t += TICK_MS / 1000;
      const { vx: cvx, vy: cvy } = posRef.current;
      const nx = posRef.current.x + cvx * (TICK_MS / 1000);
      const ny = posRef.current.y + cvy * (TICK_MS / 1000) - 0.5 * GRAVITY * (TICK_MS / 1000) ** 2;
      const nvy = cvy - GRAVITY * (TICK_MS / 1000);

      if (ny <= GROUND_Y && t > 0.1) {
        // Landed
        stopPhysics();
        const dist = Math.round(nx);
        posRef.current = { x: nx, y: 0, vx: 0, vy: 0 };
        setBallPos({ x: nx, y: 0 });
        setDistance(dist);
        setPhase('landed'); phaseRef.current = 'landed';
        setTopDistance(prev => Math.max(prev, dist));
        setLeaderboard(prev => {
          const next = [{ user: shooter, distance: dist, ts: Date.now() }, ...prev]
            .sort((a, b) => b.distance - a.distance).slice(0, 10);
          return next;
        });
        // Spawn particles
        setParticles(Array.from({ length: 12 }, (_, i) => ({
          id: i, x: nx, angle: (i / 12) * 360, speed: 2 + Math.random() * 3
        })));
        setTimeout(() => setParticles([]), 1500);
      } else {
        posRef.current = { x: nx, y: ny, vx: cvx, vy: nvy };
        setBallPos({ x: nx, y: ny });
      }
    }, TICK_MS);
  }, [angle, stopPhysics]);

  const reset = useCallback(() => {
    stopPhysics();
    setPhase('idle'); phaseRef.current = 'idle';
    setBallPos({ x: 0, y: 0 });
    setDistance(0);
    boostRef.current = [];
    setBoostQueue([]);
    multRef.current = 1;
    setActivePowerMultiplier(1);
  }, [stopPhysics]);

  /** Called when a TikTok gift arrives — adds a boost to the queue */
  const processGift = useCallback((user, coins) => {
    const tier = getBoostTier(coins);
    const boost = { ...tier, user, coins };
    boostRef.current = [...boostRef.current, boost];
    setBoostQueue([...boostRef.current]);
    // Auto-launch if idle or landed — gift triggers the shot
    const p = phaseRef.current;
    if (p === 'idle' || p === 'landed') {
      setTimeout(() => launch(user), 300);
    }
  }, [launch]);

  useEffect(() => () => stopPhysics(), [stopPhysics]);

  return {
    phase, angle, power: BASE_POWER * activePowerMultiplier,
    ballPos, distance, topDistance, activeBoost, boostQueue,
    leaderboard, lastShooter, particles, roundCount,
    activePowerMultiplier,
    setAngle: useCallback(v => setAngle(Math.max(10, Math.min(80, v))), []),
    launch, reset, processGift,
    getBoostTier,
  };
}
