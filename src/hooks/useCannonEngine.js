/**
 * useCannonEngine v3 — Ball Guys style
 * Chest pick → aiming wobble → rolling along flat shelf → landed
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export const BOOST_TIERS = {
  small:  { label: 'Boost!',       color: '#00e5ff', launchBonus: 80,  emoji: '💨', coins: [1,9]    },
  medium: { label: 'Power Boost!', color: '#ffd600', launchBonus: 160, emoji: '⚡', coins: [10,99]   },
  large:  { label: 'Super Boost!', color: '#ff6d00', launchBonus: 280, emoji: '🔥', coins: [100,999] },
  mega:   { label: 'MEGA BLAST!',  color: '#ff1744', launchBonus: 500, emoji: '💥', coins: [1000,9999]},
  ultra:  { label: 'ULTRA BLAST!', color: '#ea80fc', launchBonus: 900, emoji: '🌟', coins: [10000,Infinity]},
};

export function getBoostTier(coins) {
  for (const [id, tier] of Object.entries(BOOST_TIERS)) {
    if (coins >= tier.coins[0] && coins <= tier.coins[1]) return { id, ...tier };
  }
  return { id: 'small', ...BOOST_TIERS.small };
}

const LAUNCH_POOL = [1, 1.5, 2, 2.5, 3, 3.5];
const BOMB_POOL   = [1, 2, 3, 4, 5, 6];
const POWER_POOL  = [1, 1.5, 2, 3, 4, 5];

function generateShelf(bombMult, powerMult) {
  const objects = [];
  const totalLen = 5000;
  const bombCount  = Math.round(5 * bombMult);
  const powerCount = Math.round(4 * powerMult);
  const total = bombCount + powerCount;
  const types = [...Array(bombCount).fill('bomb'), ...Array(powerCount).fill('power')].sort(() => Math.random() - 0.5);
  for (let i = 0; i < total; i++) {
    const base = 180 + (i / total) * (totalLen - 300);
    const x = base + (Math.random() - 0.5) * 80;
    objects.push({ id: `${types[i]}_${i}`, type: types[i], x, active: true });
  }
  return objects.sort((a, b) => a.x - b.x);
}

const TICK_MS  = 16;
const FRICTION = 0.9984;
const STOP_SPD = 5;
const BASE_SPD = 500;

export function useCannonEngine() {
  const [phase, setPhase]             = useState('idle');
  const [angle, setAngle]             = useState(15);
  const [ballX, setBallX]             = useState(0);
  const [cameraX, setCameraX]         = useState(0);
  const [distance, setDistance]       = useState(0);
  const [topDistance, setTopDistance] = useState(0);
  const [activeBoost, setActiveBoost] = useState(null);
  const [boostQueue, setBoostQueue]   = useState([]);
  const [worldObjects, setWorldObjects] = useState([]);
  const [explosions, setExplosions]   = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastShooter, setLastShooter] = useState(null);
  const [roundCount, setRoundCount]   = useState(0);
  const [chests, setChests]           = useState([]);
  const [pickedChests, setPickedChests] = useState([]);
  const [multipliers, setMultipliers] = useState({ launch: 1, bomb: 1, power: 1 });

  const phaseRef    = useRef('idle');
  const ballXRef    = useRef(0);
  const vxRef       = useRef(0);
  const boostRef    = useRef([]);
  const objRef      = useRef([]);
  const multRef     = useRef({ launch: 1, bomb: 1, power: 1 });
  const timerRef    = useRef(null);
  const wobbleRef   = useRef(null);
  const shooterRef  = useRef('host');
  const pickedRef   = useRef([]);

  const stopAll = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (wobbleRef.current) { clearInterval(wobbleRef.current); wobbleRef.current = null; }
  }, []);

  // ── Build 9 chests ────────────────────────────────────────────────────────
  const buildChests = useCallback(() => {
    const launchPrizes = [...LAUNCH_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    const bombPrizes   = [...BOMB_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    const powerPrizes  = [...POWER_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    const types = ['launch','launch','launch','bomb','bomb','bomb','power','power','power'];
    const prizes = [...launchPrizes, ...bombPrizes, ...powerPrizes];
    // Shuffle together
    const arr = types.map((t, i) => ({ id: i, type: t, prize: prizes[i], revealed: false }))
      .sort(() => Math.random() - 0.5).map((c, i) => ({ ...c, id: i }));
    return arr;
  }, []);

  // ── Start chest pick phase ────────────────────────────────────────────────
  const startChestPick = useCallback((shooter = 'host') => {
    const p = phaseRef.current;
    if (p === 'rolling' || p === 'aiming' || p === 'chest_pick') return;
    shooterRef.current = shooter;
    pickedRef.current = [];
    multRef.current = { launch: 1, bomb: 1, power: 1 };
    setChests(buildChests());
    setPickedChests([]);
    setMultipliers({ launch: 1, bomb: 1, power: 1 });
    setPhase('chest_pick'); phaseRef.current = 'chest_pick';
  }, [buildChests]);

  // ── Pick a chest ──────────────────────────────────────────────────────────
  const pickChest = useCallback((chestId) => {
    if (phaseRef.current !== 'chest_pick') return;
    if (pickedRef.current.includes(chestId)) return;
    if (pickedRef.current.length >= 3) return;

    pickedRef.current = [...pickedRef.current, chestId];
    setPickedChests([...pickedRef.current]);

    setChests(prev => prev.map(c => c.id === chestId ? { ...c, revealed: true } : c));

    // Apply prize to multipliers
    setChests(prev => {
      const chest = prev.find(c => c.id === chestId);
      if (!chest) return prev;
      const newMult = { ...multRef.current };
      newMult[chest.type] = newMult[chest.type] * chest.prize;
      multRef.current = newMult;
      setMultipliers({ ...newMult });
      return prev.map(c => c.id === chestId ? { ...c, revealed: true } : c);
    });

    // Auto-advance when 3 picked
    if (pickedRef.current.length >= 3) {
      setTimeout(() => startAiming(), 800);
    }
  }, []);

  // ── Aiming wobble ─────────────────────────────────────────────────────────
  const startAiming = useCallback(() => {
    setPhase('aiming'); phaseRef.current = 'aiming';
    const start = Date.now();
    const DURATION = 1600;
    wobbleRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= DURATION) {
        clearInterval(wobbleRef.current); wobbleRef.current = null;
        const finalAngle = 5 + Math.floor(Math.random() * 25); // 5–30° (shallow, like Ball Guys)
        setAngle(finalAngle);
        setTimeout(() => fireRoll(finalAngle), 200);
        return;
      }
      const t = elapsed / DURATION;
      const a = 15 + Math.sin(t * Math.PI * 6) * 18 * (1 - t * 0.5);
      setAngle(Math.max(2, Math.min(40, Math.round(a))));
    }, 30);
  }, []);

  // ── Roll physics ──────────────────────────────────────────────────────────
  const fireRoll = useCallback((finalAngle) => {
    const m = multRef.current;
    const queueBonus = boostRef.current.reduce((s, b) => s + b.launchBonus, 0);
    const lastBoost  = boostRef.current[boostRef.current.length - 1] ?? null;
    boostRef.current = []; setBoostQueue([]);

    const startVx = (BASE_SPD * m.launch) + queueBonus;
    if (lastBoost) { setActiveBoost(lastBoost); setTimeout(() => setActiveBoost(null), 2000); }

    // Generate shelf
    const objects = generateShelf(m.bomb, m.power);
    objRef.current = objects;
    setWorldObjects([...objects]);

    ballXRef.current = 0;
    vxRef.current    = startVx;
    setBallX(0);
    setCameraX(0);
    setDistance(0);
    setLastShooter(shooterRef.current);
    setRoundCount(n => n + 1);
    setPhase('rolling'); phaseRef.current = 'rolling';

    const shooter = shooterRef.current;
    const dt = TICK_MS / 1000;

    timerRef.current = setInterval(() => {
      // Apply friction
      vxRef.current *= FRICTION;
      ballXRef.current += vxRef.current * dt;

      // Check object collisions (within 28px)
      const bx = ballXRef.current;
      for (const obj of objRef.current) {
        if (!obj.active) continue;
        if (Math.abs(bx - obj.x) < 28) {
          objRef.current = objRef.current.map(o => o.id === obj.id ? { ...o, active: false } : o);
          setWorldObjects([...objRef.current]);
          const expId = Date.now() + Math.random();
          if (obj.type === 'bomb') {
            vxRef.current += 220 + Math.random() * 80;
            const col = '#ff4400';
            setExplosions(p => [...p, { id: expId, x: bx, color: col }]);
            setTimeout(() => setExplosions(p => p.filter(e => e.id !== expId)), 700);
            setActiveBoost({ emoji: '💣', label: 'BOMB!', color: col });
            setTimeout(() => setActiveBoost(null), 900);
          } else {
            vxRef.current *= 1.45;
            const col = '#ffd700';
            setExplosions(p => [...p, { id: expId, x: bx, color: col }]);
            setTimeout(() => setExplosions(p => p.filter(e => e.id !== expId)), 500);
            setActiveBoost({ emoji: '⚡', label: 'POWER!', color: col });
            setTimeout(() => setActiveBoost(null), 700);
          }
          break;
        }
      }

      // Camera follows ball
      const CANVAS_W = 860;
      setCameraX(Math.max(0, bx - CANVAS_W * 0.3));
      setBallX(bx);
      setDistance(Math.round(bx / 10)); // 10px = 1m

      if (vxRef.current < STOP_SPD) {
        stopAll();
        const dist = Math.round(bx / 10);
        setPhase('landed'); phaseRef.current = 'landed';
        setDistance(dist);
        setTopDistance(prev => Math.max(prev, dist));
        setLeaderboard(prev =>
          [{ user: shooter, distance: dist, ts: Date.now() }, ...prev]
            .sort((a, b) => b.distance - a.distance).slice(0, 10)
        );
      }
    }, TICK_MS);
  }, [stopAll]);

  // ── Gift handling ─────────────────────────────────────────────────────────
  const processGift = useCallback((user, coins) => {
    const tier = getBoostTier(coins);
    const boost = { ...tier, user, coins };
    const p = phaseRef.current;
    if (p === 'rolling') {
      // Apply boost immediately during rolling
      vxRef.current += boost.launchBonus;
      setActiveBoost(boost);
      setTimeout(() => setActiveBoost(null), 1500);
    } else {
      boostRef.current = [...boostRef.current, boost];
      setBoostQueue([...boostRef.current]);
      if (p === 'idle' || p === 'landed') {
        setTimeout(() => startChestPick(user), 200);
      }
    }
  }, [startChestPick]);

  const manualFire = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'idle' || p === 'landed') startChestPick('host');
    else if (p === 'chest_pick') {
      // Auto-pick remaining chests and go
      const remaining = chests.filter(c => !c.revealed).map(c => c.id);
      // pick random ones up to 3 total
      let toGo = 3 - pickedRef.current.length;
      remaining.sort(() => Math.random() - 0.5).slice(0, toGo).forEach(id => pickChest(id));
    }
  }, [startChestPick, chests, pickChest]);

  const reset = useCallback(() => {
    stopAll();
    setPhase('idle'); phaseRef.current = 'idle';
    setBallX(0); ballXRef.current = 0;
    setCameraX(0); vxRef.current = 0;
    setDistance(0); setAngle(15);
    boostRef.current = []; setBoostQueue([]);
    setActiveBoost(null); setExplosions([]);
    setWorldObjects([]); objRef.current = [];
    setChests([]); setPickedChests([]);
    setMultipliers({ launch: 1, bomb: 1, power: 1 });
    multRef.current = { launch: 1, bomb: 1, power: 1 };
  }, [stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  return {
    phase, angle, ballX, cameraX, distance, topDistance,
    activeBoost, boostQueue, worldObjects, explosions,
    leaderboard, lastShooter, roundCount, multipliers,
    chests, pickedChests,
    pickChest, manualFire, reset, processGift,
  };
}
